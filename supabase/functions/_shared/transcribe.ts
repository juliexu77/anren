/**
 * Turning audio into words, shared by the pass that runs while someone is
 * still talking (`transcribe-part`) and the one that finishes the job when
 * they stop (`process-note`).
 */

export const WAV_HEADER = 44;
export const PART_RATE = 16000;
export const BYTES_PER_SECOND = PART_RATE * 2;

/**
 * Ninety seconds of 16 kHz mono. Small enough that even a short memo is split
 * into a few pieces transcribed at the same time.
 */
export const CHUNK_BYTES = 90 * BYTES_PER_SECOND;
/** How far either side of a boundary to look for a quiet moment. */
const CUT_SEARCH = 4 * BYTES_PER_SECOND;
/** A little of the previous chunk is repeated so nothing falls in the crack. */
const OVERLAP = Math.floor(1.5 * BYTES_PER_SECOND);
const WINDOW = Math.floor(0.1 * BYTES_PER_SECOND);
const CONCURRENCY = 4;

async function transcribeOne(audio: Blob): Promise<string> {
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) throw new Error('OPENAI_API_KEY is not configured');

  const form = new FormData();
  form.append('model', 'gpt-4o-mini-transcribe');
  form.append('file', new File([audio], 'note.wav', { type: 'audio/wav' }));

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Transcription failed [${response.status}]: ${details}`);
  }

  const data = await response.json();
  return (data.text ?? '').trim();
}

/** A stretch of speech is worth two more tries before it's given up on. */
async function transcribeWithRetries(audio: Blob): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await transcribeOne(audio);
    } catch (error) {
      console.error(`chunk attempt ${attempt + 1} failed:`, (error as Error).message);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}

/** Wrap raw 16-bit mono PCM in a WAV header so it can be transcribed. */
export function wrapPcm(pcm: Uint8Array, rate = PART_RATE): Blob {
  const header = new ArrayBuffer(WAV_HEADER);
  const view = new DataView(header);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm as unknown as BlobPart], { type: 'audio/wav' });
}

/**
 * Cutting at an exact byte count lands mid-word almost every time. Look around
 * the boundary for the quietest tenth of a second and cut there instead.
 */
function quietCut(pcm: Uint8Array, target: number): number {
  const from = Math.max(WINDOW, target - CUT_SEARCH);
  const to = Math.min(pcm.length - WINDOW, target + CUT_SEARCH);
  if (to <= from) return target;

  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1);
  let best = target;
  let bestEnergy = Infinity;
  for (let byte = from; byte < to; byte += WINDOW) {
    const start = byte >> 1;
    const end = Math.min(start + (WINDOW >> 1), samples.length);
    let energy = 0;
    for (let i = start; i < end; i++) energy += Math.abs(samples[i]);
    energy /= Math.max(1, end - start);
    if (energy < bestEnergy) {
      bestEnergy = energy;
      best = byte;
    }
  }
  return best & ~1;
}

/** Where each chunk starts and ends, cut at quiet moments and overlapped. */
function chunkRanges(pcm: Uint8Array): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let start = 0;
  while (start < pcm.length) {
    if (pcm.length - start <= CHUNK_BYTES) {
      ranges.push([start, pcm.length]);
      break;
    }
    const end = quietCut(pcm, start + CHUNK_BYTES);
    ranges.push([start, end]);
    start = Math.max(end - OVERLAP, start + WINDOW);
  }
  return ranges;
}

const words = (text: string) => text.split(/\s+/).filter(Boolean);

/**
 * Chunks overlap by design, so the same words can arrive twice. Find the
 * longest run the two pieces share at the seam and keep it only once.
 */
export function joinOverlap(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  const tail = words(left).slice(-14);
  const head = words(right);
  const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  for (let n = Math.min(tail.length, head.length); n >= 2; n--) {
    const a = tail.slice(-n).map(norm).join(' ');
    const b = head.slice(0, n).map(norm).join(' ');
    if (a && a === b) return `${left} ${head.slice(n).join(' ')}`.trim();
  }
  return `${left} ${right}`.trim();
}

export const joinAll = (texts: Array<string | null>) =>
  texts.reduce<string>((acc, text) => joinOverlap(acc, (text ?? '').trim()), '').trim();

/**
 * However long someone talked, the whole thing gets written down: the audio is
 * split at quiet moments and transcribed a few pieces at a time.
 */
export async function transcribePcm(
  pcm: Uint8Array,
  onProgress?: (partial: string) => Promise<void>,
): Promise<string> {
  const ranges = chunkRanges(pcm);
  const texts: Array<string | null> = new Array(ranges.length).fill(null);

  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = ranges.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ([start, end], offset) => {
        if (end - start < BYTES_PER_SECOND) return; // under a second of tail
        texts[i + offset] = await transcribeWithRetries(wrapPcm(pcm.subarray(start, end)));
      }),
    );
    if (onProgress && ranges.length > 1) {
      await onProgress(joinAll(texts.slice(0, i + batch.length))).catch(() => {});
    }
  }

  return joinAll(texts);
}

const partIndex = (name: string): number => {
  const match = name.match(/(\d+)\.wav$/);
  return match ? Number(match[1]) : -1;
};

/** The slices pushed up while someone was talking, in the order they happened. */
// deno-lint-ignore no-explicit-any
export async function listParts(admin: any, prefix: string): Promise<string[]> {
  const folder = prefix.replace(/\/$/, '');
  const { data: files } = await admin.storage.from('voice-notes').list(folder, { limit: 5000 });
  return (files ?? [])
    .map((f: { name: string }) => f.name)
    .filter((name: string) => name.endsWith('.wav') && partIndex(name) >= 0)
    .sort((a: string, b: string) => partIndex(a) - partIndex(b));
}

/**
 * Transcribe the slices that haven't been written down yet, and hand back the
 * words plus how far the transcript has now got. Nothing is held in memory
 * beyond one batch at a time.
 */
// deno-lint-ignore no-explicit-any
export async function transcribeNewParts(
  admin: any,
  prefix: string,
  from: number,
  onProgress?: (partial: string) => Promise<void>,
): Promise<{ text: string; upTo: number }> {
  const folder = prefix.replace(/\/$/, '');
  const all = await listParts(admin, prefix);
  const pending = all.filter((name) => partIndex(name) >= from);
  if (!pending.length) return { text: '', upTo: from };

  const upTo = partIndex(pending[pending.length - 1]) + 1;
  const texts: string[] = [];
  let batch: Uint8Array[] = [];
  let batchBytes = 0;

  const flush = async () => {
    if (!batchBytes) return;
    const pcm = new Uint8Array(batchBytes);
    let at = 0;
    for (const piece of batch) {
      pcm.set(piece, at);
      at += piece.length;
    }
    batch = [];
    batchBytes = 0;
    texts.push(await transcribePcm(pcm));
    if (onProgress) await onProgress(joinAll(texts)).catch(() => {});
  };

  // A five-second slice per file means many small downloads; fetching them a
  // handful at a time keeps that from becoming the wait.
  const DOWNLOADS = 8;
  for (let i = 0; i < pending.length; i += DOWNLOADS) {
    const names = pending.slice(i, i + DOWNLOADS);
    const pieces = await Promise.all(
      names.map(async (name) => {
        const { data } = await admin.storage.from('voice-notes').download(`${folder}/${name}`);
        if (!data) return null;
        const bytes = new Uint8Array(await data.arrayBuffer());
        return bytes.length > WAV_HEADER ? bytes.subarray(WAV_HEADER) : null;
      }),
    );
    for (const pcm of pieces) {
      if (!pcm) continue;
      batch.push(pcm);
      batchBytes += pcm.length;
    }
    if (batchBytes >= CHUNK_BYTES) await flush();
  }

  await flush();

  return { text: joinAll(texts), upTo };
}
