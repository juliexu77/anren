import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, embed, chunkText, parseJsonBlock, jsonResponse , QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';
import { WAV_HEADER, joinOverlap, transcribeNewParts, transcribePcm } from '../_shared/transcribe.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `You turn a person's spoken voice memo into a short written record they will read later.

Return strict JSON:
{
  "title": "one line, max 9 words, in their own voice, naming the actual thought — never 'Voice note' or a date",
  "synthesis": "3-6 bullet points, one per line, each starting with '- '. Each bullet is one short sentence: what they were working out, any decision or intention, anything they said they'd do. No headings, no nested bullets, no prose paragraphs."
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
  "synthesis": "3-6 bullet points, one per line, each starting with '- '. Each bullet is one short sentence: what they were working out, any decision or intention, anything they said they'd do. No headings, no nested bullets, no prose paragraphs."
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

/**
 * Almost every recording is already written down by the time this runs — the
 * slices go up and get transcribed while the person is still talking. All
 * that's left here is whatever hasn't been covered yet.
 */
// deno-lint-ignore no-explicit-any
async function finishTranscript(
  admin: any,
  note: { id: string; user_id: string; audio_path: string; transcript: string | null; transcribed_parts: number | null },
): Promise<string> {
  // A pass started during the recording may still be running; let it land so
  // the same words don't get written down twice.
  for (let wait = 0; wait < 10; wait++) {
    const { data: state } = await admin
      .from('notes')
      .select('transcript, transcribed_parts, transcribe_lock_at')
      .eq('id', note.id)
      .maybeSingle();
    if (state) {
      note.transcript = state.transcript;
      note.transcribed_parts = state.transcribed_parts;
    }
    const lock = state?.transcribe_lock_at ? Date.parse(state.transcribe_lock_at) : 0;
    if (!lock || Date.now() - lock > 120_000) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  const already = (note.transcript ?? '').trim();
  const from = note.transcribed_parts ?? 0;



  if (note.audio_path.endsWith('/') || from > 0) {
    const prefix = note.audio_path.endsWith('/') ? note.audio_path : `${note.user_id}/${note.id}/`;
    const { text, upTo } = await transcribeNewParts(admin, prefix, from);
    const transcript = joinOverlap(already, text);
    if (text) {
      await admin
        .from('notes')
        .update({ transcript, transcribed_parts: upTo })
        .eq('id', note.id);
    }
    return transcript;
  }

  const { data } = await admin.storage.from('voice-notes').download(note.audio_path);
  if (data) {
    const bytes = new Uint8Array(await data.arrayBuffer());
    return await transcribePcm(bytes.subarray(WAV_HEADER), async (partial: string) => {
      if (partial) await admin.from('notes').update({ transcript: partial }).eq('id', note.id);
    });
  }

  // Older path: the single file never landed, but the slices did.
  const { text } = await transcribeNewParts(admin, `${note.user_id}/${note.id}/`, 0);
  return joinOverlap(already, text);
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
      .select('id, user_id, audio_path, source, body, title, transcript, transcribed_parts, continues_note_id, duration_seconds')
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
      transcript = await finishTranscript(admin, {
        id: noteId,
        user_id: note.user_id as string,
        audio_path: note.audio_path as string,
        transcript: note.transcript as string | null,
        transcribed_parts: note.transcribed_parts as number | null,
      });

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

      await admin.from('notes').update({ transcript }).eq('id', noteId);
    }

    /**
     * The words are safe. Everything below — merging a continuation, the title,
     * the bullets, throwing the recording away, indexing for search — happens
     * after the reply, so nobody has to stand there watching a spinner. The
     * note is already in the feed and fills in where it sits.
     */
    const capturedId = noteId;
    const writeUp = async () => {
      let workingId = capturedId;
      let text = transcript;
      try {
        const continuesId = (note as { continues_note_id?: string | null }).continues_note_id ?? null;
        let targetTitle = typeof note.title === 'string' ? note.title.trim() : '';
        let rewriteTitle = regenerate;

        if (continuesId) {
          const { data: parent } = await admin
            .from('notes')
            .select('id, user_id, transcript, title, duration_seconds')
            .eq('id', continuesId)
            .maybeSingle();

          if (!parent || parent.user_id !== user.id) {
            throw new Error('The note this continues is gone');
          }

          const earlier = (parent.transcript ?? '').trim();
          text = [earlier, text].filter(Boolean).join('\n\n');
          targetTitle = typeof parent.title === 'string' ? parent.title.trim() : '';
          rewriteTitle = true;

          const added = (note as { duration_seconds?: number | null }).duration_seconds ?? 0;
          const before = (parent.duration_seconds as number | null) ?? 0;
          await admin
            .from('notes')
            .update({ duration_seconds: before + added, status: 'processing' })
            .eq('id', parent.id);

          // The audio is already transcribed, so the placeholder row it was
          // captured on has nothing left to hold.
          if (note.audio_path) await discardAudio(admin, note.user_id, workingId, note.audio_path);
          await admin.from('note_passages').delete().eq('note_id', workingId);
          await admin.from('notes').delete().eq('id', workingId);
          workingId = parent.id as string;
        }

        let raw: string;
        try {
          raw = await chat([
            { role: 'system', content: typed ? TYPED_SYSTEM_PROMPT : SYSTEM_PROMPT },
            {
              role: 'user',
              content: typed ? `Written note:\n\n${text}` : `Voice memo transcript:\n\n${text}`,
            },
          ], { temperature: 0.6, userId: user.id });
        } catch (error) {
          // The words are safe either way — only the write-up needs a key.
          if (error instanceof QuotaError) {
            await admin
              .from('notes')
              .update({
                transcript: text,
                status: 'needs_key',
                error_message: null,
                title: targetTitle || text.split(/[.?!]/)[0].slice(0, 70),
              })
              .eq('id', workingId);
            return;
          }
          throw error;
        }

        const parsed = parseJsonBlock<Synthesis>(raw);
        // On a regeneration the source text changed, so the old title is stale too.
        const title = (rewriteTitle ? '' : targetTitle) || parsed?.title?.trim()
          || text.split(/[.?!]/)[0].slice(0, 70);

        const synthesis = parsed?.synthesis?.trim() || text.slice(0, 400);

        await admin
          .from('notes')
          .update({ transcript: text, title, synthesis, status: 'ready', error_message: null })
          .eq('id', workingId);

        if (!typed && !continuesId && note.audio_path) {
          await discardAudio(admin, note.user_id, workingId, note.audio_path);
        }

        try {
          const passages = chunkText(`${title}\n\n${synthesis}\n\n${text}`);
          if (passages.length) {
            const vectors = await embed(passages);
            await admin.from('note_passages').delete().eq('note_id', workingId);
            await admin.from('note_passages').insert(
              passages.map((content, index) => ({
                note_id: workingId,
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
      } catch (error) {
        console.error('write-up failed:', (error as Error).message);
        await admin
          .from('notes')
          .update({ status: 'failed', error_message: 'anren couldn\'t finish writing this up.' })
          .eq('id', workingId);
      }
    };

    const runner = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } })
      .EdgeRuntime;
    if (runner?.waitUntil) runner.waitUntil(writeUp());
    else void writeUp();

    return jsonResponse({ ok: true, transcript });

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

