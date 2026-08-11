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

async function transcribe(audio: Blob): Promise<string> {
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

const WAV_HEADER = 44;
const PART_RATE = 16000;

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
  return new Blob([header, pcm], { type: 'audio/wav' });
}

/**
 * A recording that never got its whole-file upload lives on as the slices
 * pushed up while the person was still talking. Stitch them back together,
 * store the result as the note's audio, and clear the pieces away.
 */
// deno-lint-ignore no-explicit-any
async function stitchParts(admin: any, userId: string, noteId: string, prefix: string): Promise<Blob | null> {
  const folder = prefix.replace(/\/$/, '');
  const { data: files } = await admin.storage.from('voice-notes').list(folder, { limit: 1000 });
  const parts = (files ?? [])
    .filter((f: { name: string }) => f.name.endsWith('.wav'))
    .map((f: { name: string }) => f.name)
    .sort();
  if (!parts.length) return null;

  const pieces: Uint8Array[] = [];
  for (const name of parts) {
    const { data } = await admin.storage.from('voice-notes').download(`${folder}/${name}`);
    if (!data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.length > WAV_HEADER) pieces.push(bytes.subarray(WAV_HEADER));
  }
  if (!pieces.length) return null;

  const total = pieces.reduce((n, p) => n + p.length, 0);
  const pcm = new Uint8Array(total);
  let offset = 0;
  for (const piece of pieces) {
    pcm.set(piece, offset);
    offset += piece.length;
  }

  const blob = wrapPcm(pcm);
  const path = `${userId}/${noteId}.wav`;
  const { error } = await admin.storage
    .from('voice-notes')
    .upload(path, blob, { contentType: 'audio/wav', upsert: true });
  if (!error) {
    await admin.from('notes').update({ audio_path: path }).eq('id', noteId);
    await admin.storage.from('voice-notes').remove(parts.map((n: string) => `${folder}/${n}`));
  }
  return blob;
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
      .select('id, user_id, audio_path, source, body, title')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError) throw noteError;
    if (!note || note.user_id !== user.id) return jsonResponse({ error: 'Note not found' }, 404);

    const typed = note.source === 'typed';
    let transcript: string;

    if (typed) {
      transcript = (note.body ?? '').trim();
      if (!transcript) return jsonResponse({ error: 'Note has no text yet' }, 400);
    } else {
      if (!note.audio_path) return jsonResponse({ error: 'Note has no audio yet' }, 400);

      let audio: Blob | null = null;
      if (note.audio_path.endsWith('/')) {
        audio = await stitchParts(admin, note.user_id, noteId, note.audio_path);
      } else {
        const { data } = await admin.storage.from('voice-notes').download(note.audio_path);
        audio = data ?? null;
        // Older path: the single file never landed, but the slices did.
        if (!audio) audio = await stitchParts(admin, note.user_id, noteId, `${note.user_id}/${noteId}/`);
      }
      if (!audio) throw new Error('Audio not found');

      transcript = await transcribe(audio);
      if (!transcript) {
        await admin
          .from('notes')
          .update({
            status: 'ready',
            transcript: '',
            title: 'Nothing came through',
            synthesis: "This recording didn't carry any speech Anren could hear.",
          })
          .eq('id', noteId);
        return jsonResponse({ ok: true, transcript: '' });
      }
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
            title: (typeof note.title === 'string' && note.title.trim())
              || transcript.split(/[.?!]/)[0].slice(0, 70),
          })
          .eq('id', noteId);
        return needsOwnKeyResponse();
      }
      throw error;
    }

    const parsed = parseJsonBlock<Synthesis>(raw);
    const existingTitle = typeof note.title === 'string' ? note.title.trim() : '';
    // On a regeneration the source text changed, so the old title is stale too.
    const title = (regenerate ? '' : existingTitle) || parsed?.title?.trim()
      || transcript.split(/[.?!]/)[0].slice(0, 70);

    const synthesis = parsed?.synthesis?.trim() || transcript.slice(0, 400);

    await admin
      .from('notes')
      .update({ transcript, title, synthesis, status: 'ready', error_message: null })
      .eq('id', noteId);

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
        .update({ status: 'failed', error_message: 'Anren couldn\'t finish writing this up.' })
        .eq('id', noteId);
    }
    return jsonResponse({ error: message }, 500);
  }
});
