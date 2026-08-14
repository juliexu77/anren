import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/ai.ts';
import { joinOverlap, transcribeNewParts } from '../_shared/transcribe.ts';

/**
 * Writing down the words while someone is still talking.
 *
 * Slices of audio land in storage every few seconds during a recording. This
 * takes whatever slices haven't been transcribed yet, turns them into text, and
 * appends them to the note — so by the time the person taps "keep it", almost
 * everything they said is already written down and there is nothing to wait for.
 */

/** A run that stalls shouldn't block the next one for longer than this. */
const LOCK_MS = 120_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
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
    const noteId = typeof body.noteId === 'string' ? body.noteId : undefined;
    if (!noteId) return jsonResponse({ error: 'noteId is required' }, 400);

    const { data: note } = await admin
      .from('notes')
      .select('id, user_id, audio_path, source, transcript, transcribed_parts')
      .eq('id', noteId)
      .maybeSingle();

    if (!note || note.user_id !== user.id) return jsonResponse({ error: 'Note not found' }, 404);
    if (note.source === 'typed') return jsonResponse({ ok: true, upTo: 0 });

    // Only one pass at a time per note, or two runs would write the same words.
    const stale = new Date(Date.now() - LOCK_MS).toISOString();
    const { data: claimed } = await admin
      .from('notes')
      .update({ transcribe_lock_at: new Date().toISOString() })
      .eq('id', noteId)
      .or(`transcribe_lock_at.is.null,transcribe_lock_at.lt.${stale}`)
      .select('id');

    if (!claimed?.length) return jsonResponse({ ok: true, busy: true });

    try {
      const prefix = `${note.user_id}/${noteId}/`;
      const from = (note.transcribed_parts as number | null) ?? 0;
      const { text, upTo } = await transcribeNewParts(admin, prefix, from);

      if (!text) {
        await admin.from('notes').update({ transcribe_lock_at: null }).eq('id', noteId);
        return jsonResponse({ ok: true, upTo: from });
      }

      // Read the transcript again at the last moment: an edit or an earlier
      // pass may have landed while this one was running.
      const { data: fresh } = await admin
        .from('notes')
        .select('transcript, transcribed_parts')
        .eq('id', noteId)
        .maybeSingle();

      const already = (fresh?.transcribed_parts as number | null) ?? from;
      if (already > from) {
        await admin.from('notes').update({ transcribe_lock_at: null }).eq('id', noteId);
        return jsonResponse({ ok: true, upTo: already });
      }

      const transcript = joinOverlap((fresh?.transcript as string | null) ?? '', text);
      await admin
        .from('notes')
        .update({ transcript, transcribed_parts: upTo, transcribe_lock_at: null })
        .eq('id', noteId);

      return jsonResponse({ ok: true, upTo });
    } catch (error) {
      await admin.from('notes').update({ transcribe_lock_at: null }).eq('id', noteId);
      throw error;
    }
  } catch (error) {
    const message = (error as Error).message ?? 'Transcription failed';
    console.error('transcribe-part error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
