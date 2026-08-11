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
  const form = new FormData();
  form.append('model', 'openai/gpt-4o-transcribe');
  form.append('file', new File([audio], 'note.wav', { type: 'audio/wav' }));

  const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: form,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Transcription failed [${response.status}]: ${details}`);
  }

  const data = await response.json();
  return (data.text ?? '').trim();
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

      const { data: audio, error: downloadError } = await admin.storage
        .from('voice-notes')
        .download(note.audio_path);
      if (downloadError || !audio) throw downloadError ?? new Error('Audio not found');

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

    const raw = await chat([
      { role: 'system', content: typed ? TYPED_SYSTEM_PROMPT : SYSTEM_PROMPT },
      {
        role: 'user',
        content: typed ? `Written note:\n\n${transcript}` : `Voice memo transcript:\n\n${transcript}`,
      },
    ], { temperature: 0.6, userId: user.id });

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
