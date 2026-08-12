import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, embed, chunkText, parseJsonBlock, jsonResponse , QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `You turn a person's spoken voice memo into a short written record they will read later.

Return strict JSON:
{
  "title": "one line, max 9 words, in their own voice, naming the actual thought — never 'Voice note' or a date",
  "synthesis": "2-4 sentences describing what they were working out, any decision or intention, and anything they said they'd do. Plain prose, no bullet points, no headings."
}

Rules:
- Write about them in second person ("You were weighing…"), but keep it settled and descriptive — not interpretive, not hedged.
- State what happened in the memo. Do not speculate, diagnose, or infer what it means about them.
- Keep their words and specifics; never invent detail that wasn't said.
- Warm, plain, unhurried. No corporate or productivity language. No emojis.
- If the recording is too short or unclear, say so plainly in the synthesis.`;

const TYPED_SYSTEM_PROMPT = `You turn something a person wrote or pasted into their own archive into a short written record they will read later.

Return strict JSON:
{
  "title": "one line, max 9 words, in their own voice, naming the actual thought — never 'Note' or a date",
  "synthesis": "2-4 sentences describing what they were working out, any decision or intention, and anything they said they'd do. Plain prose, no bullet points, no headings."
}

Rules:
- Write about them in second person ("You were weighing…"), settled and descriptive — not interpretive, not hedged.
- These are their written words, not speech. Never say "you said", "in this recording", or "you mentioned out loud".
- Keep their words and specifics; never invent detail that wasn't there.
- Warm, plain, unhurried. No corporate or productivity language. No emojis.
- If the text is very short, keep the synthesis just as short rather than padding it.`;

interface Synthesis {
  title: string;
  synthesis: string;
}

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


const WAV_HEADER = 44;
const PART_RATE = 16000;
const BYTES_PER_SECOND = PART_RATE * 2;

/** Wrap raw 16-bit mono PCM in a WAV header so it can be transcribed. */
function wrapPcm(pcm: Uint8Array, rate = PART_RATE): Blob {
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

/** Ten minutes of 16 kHz mono — comfortably inside the transcriber's limits. */
const CHUNK_BYTES = 10 * 60 * BYTES_PER_SECOND;
/** How far either side of a boundary to look for a quiet moment. */
const CUT_SEARCH = 4 * BYTES_PER_SECOND;
/** A little of the previous chunk is repeated so nothing falls in the crack. */
const OVERLAP = Math.floor(1.5 * BYTES_PER_SECOND);
const WINDOW = Math.floor(0.1 * BYTES_PER_SECOND);
const CONCURRENCY = 3;

/**
 * Cutting at an exact byte count lands mid-word almost every time. Look around
 * the boundary for the quietest tenth of a second and cut there instead, so
 * splits fall in the pauses between sentences.
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

/** Where each chunk starts and ends, cut at quiet moments and slightly overlapped. */
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
function joinOverlap(left: string, right: string): string {
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

const joinAll = (texts: Array<string | null>) =>
  texts.reduce<string>((acc, text) => joinOverlap(acc, (text ?? '').trim()), '').trim();

/**
 * However long someone talked, the whole thing gets written down: the audio is
 * split at quiet moments, transcribed a few pieces at a time, and stitched back
 * into one transcript. Each finished piece is saved as it lands, so a failure
 * partway through costs one piece rather than the whole recording.
 */
async function transcribePcm(
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

/**
 * A recording that never got its whole-file upload lives on as the slices
 * pushed up while the person was still talking. Read them back in order,
 * transcribing each ten-minute batch as it fills so the whole recording is
 * never held in memory at once.
 */
// deno-lint-ignore no-explicit-any
async function transcribeParts(
  admin: any,
  prefix: string,
  onProgress?: (partial: string) => Promise<void>,
): Promise<string> {
  const folder = prefix.replace(/\/$/, '');
  const { data: files } = await admin.storage.from('voice-notes').list(folder, { limit: 2000 });
  const parts = (files ?? [])
    .filter((f: { name: string }) => f.name.endsWith('.wav'))
    .map((f: { name: string }) => f.name)
    .sort();
  if (!parts.length) return '';

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

  for (const name of parts) {
    const { data } = await admin.storage.from('voice-notes').download(`${folder}/${name}`);
    if (!data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.length <= WAV_HEADER) continue;
    const pcm = bytes.subarray(WAV_HEADER);
    batch.push(pcm);
    batchBytes += pcm.length;
    if (batchBytes >= CHUNK_BYTES) await flush();
  }
  await flush();

  return joinAll(texts);
}


/**
 * Once the words are written down, the recording has done its job. Keeping it
 * would only mean storing your voice for no reason, so it goes.
 */
async function discardAudio(admin: any, userId: string, noteId: string, path: string) {
  try {
    const folder = `${userId}/${noteId}`;
    const { data: files } = await admin.storage.from('voice-notes').list(folder, { limit: 1000 });
    const targets = (files ?? []).map((f: { name: string }) => `${folder}/${f.name}`);
    if (!path.endsWith('/')) targets.push(path);
    if (targets.length) await admin.storage.from('voice-notes').remove(targets);
    await admin.from('notes').update({ audio_path: null }).eq('id', noteId);
  } catch (error) {
    console.error('audio cleanup failed:', (error as Error).message);
  }
}





Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let noteId: string | undefined;

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    noteId = typeof body.noteId === 'string' ? body.noteId : undefined;
    const regenerate = body.regenerate === true;
    if (!noteId) return jsonResponse({ error: 'noteId is required' }, 400);


    const { data: note, error: noteError } = await admin
      .from('notes')
      .select('id, user_id, audio_path, source, body, title, transcript, continues_note_id, duration_seconds')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError) throw noteError;
    if (!note || note.user_id !== user.id) return jsonResponse({ error: 'Note not found' }, 404);

    const typed = note.source === 'typed';
    let transcript: string;

    if (typed) {
      transcript = (note.body ?? '').trim();
      if (!transcript) return jsonResponse({ error: 'Note has no text yet' }, 400);
    } else if (!note.audio_path) {
      // The audio is gone because the transcript already exists — reuse it.
      transcript = (note.transcript ?? '').trim();
      if (!transcript) return jsonResponse({ error: 'Note has no audio yet' }, 400);
    } else {
      // Each finished stretch is written to the note as it lands, so a long
      // recording shows its words arriving and a failure never costs the lot.
      const saveProgress = async (partial: string) => {
        if (partial) await admin.from('notes').update({ transcript: partial }).eq('id', noteId);
      };

      if (note.audio_path.endsWith('/')) {
        transcript = await transcribeParts(admin, note.audio_path, saveProgress);
      } else {
        const { data } = await admin.storage.from('voice-notes').download(note.audio_path);
        if (data) {
          const bytes = new Uint8Array(await data.arrayBuffer());
          transcript = await transcribePcm(bytes.subarray(WAV_HEADER), saveProgress);
        } else {
          // Older path: the single file never landed, but the slices did.
          transcript = await transcribeParts(admin, `${note.user_id}/${noteId}/`, saveProgress);
        }
      }


      if (!transcript) {
        await admin
          .from('notes')
          .update({
            status: 'ready',
            transcript: '',
            title: 'Nothing came through',
            synthesis: "This recording didn't carry any speech anren could hear.",
          })
          .eq('id', noteId);
        await discardAudio(admin, note.user_id, noteId, note.audio_path);
        return jsonResponse({ ok: true, transcript: '' });
      }
    }

    // A continuation: the new words join the note they carry on from, and the
    // whole thing is written up again.
    const continuesId = (note as { continues_note_id?: string | null }).continues_note_id ?? null;
    let targetId = noteId;
    let targetTitle = typeof note.title === 'string' ? note.title.trim() : '';
    let rewriteTitle = regenerate;

    if (continuesId) {
      const { data: parent } = await admin
        .from('notes')
        .select('id, user_id, transcript, title, duration_seconds')
        .eq('id', continuesId)
        .maybeSingle();

      if (!parent || parent.user_id !== user.id) {
        return jsonResponse({ error: 'The note this continues is gone' }, 404);
      }

      const earlier = (parent.transcript ?? '').trim();
      transcript = [earlier, transcript].filter(Boolean).join('\n\n');
      targetId = parent.id as string;
      targetTitle = typeof parent.title === 'string' ? parent.title.trim() : '';
      rewriteTitle = true;

      const added = (note as { duration_seconds?: number | null }).duration_seconds ?? 0;
      const before = (parent.duration_seconds as number | null) ?? 0;
      await admin
        .from('notes')
        .update({ duration_seconds: before + added, status: 'processing' })
        .eq('id', targetId);

      // The audio is already transcribed, so the placeholder row it was
      // captured on has nothing left to hold.
      if (note.audio_path) await discardAudio(admin, note.user_id, noteId, note.audio_path);
      await admin.from('note_passages').delete().eq('note_id', noteId);
      await admin.from('notes').delete().eq('id', noteId);
      noteId = targetId;
    }

    let raw: string;
    try {
      raw = await chat([
        { role: 'system', content: typed ? TYPED_SYSTEM_PROMPT : SYSTEM_PROMPT },
        {
          role: 'user',
          content: typed ? `Written note:\n\n${transcript}` : `Voice memo transcript:\n\n${transcript}`,
        },
      ], { temperature: 0.6, userId: user.id });
    } catch (error) {
      // The words are safe either way — only the write-up needs a key.
      if (error instanceof QuotaError) {
        await admin
          .from('notes')
          .update({
            transcript,
            status: 'needs_key',
            error_message: null,
            title: targetTitle || transcript.split(/[.?!]/)[0].slice(0, 70),
          })
          .eq('id', noteId);
        return needsOwnKeyResponse();
      }
      throw error;
    }

    const parsed = parseJsonBlock<Synthesis>(raw);
    // On a regeneration the source text changed, so the old title is stale too.
    const title = (rewriteTitle ? '' : targetTitle) || parsed?.title?.trim()
      || transcript.split(/[.?!]/)[0].slice(0, 70);

    const synthesis = parsed?.synthesis?.trim() || transcript.slice(0, 400);

    await admin
      .from('notes')
      .update({ transcript, title, synthesis, status: 'ready', error_message: null })
      .eq('id', noteId);

    // The words are safe now, so the recording itself isn't kept.
    if (!typed && !continuesId && note.audio_path) {
      await discardAudio(admin, note.user_id, noteId, note.audio_path);
    }



    // Index passages for semantic search — best effort, never blocks the note.
    try {
      const passages = chunkText(`${title}\n\n${synthesis}\n\n${transcript}`);
      if (passages.length) {
        const vectors = await embed(passages);
        await admin.from('note_passages').delete().eq('note_id', noteId);
        await admin.from('note_passages').insert(
          passages.map((content, index) => ({
            note_id: noteId,
            user_id: user.id,
            chunk_index: index,
            content,
            embedding: vectors[index] ? JSON.stringify(vectors[index]) : null,
          })),
        );
      }
    } catch (embedError) {
      console.error('embedding failed:', (embedError as Error).message);
    }

    return jsonResponse({ ok: true, title, synthesis });
  } catch (error) {
    const message = (error as Error).message ?? 'Processing failed';
    console.error('process-note error:', message);
    if (noteId) {
      await admin
        .from('notes')
        .update({ status: 'failed', error_message: 'anren couldn\'t finish writing this up.' })
        .eq('id', noteId);
    }
    return jsonResponse({ error: message }, 500);
  }
});
