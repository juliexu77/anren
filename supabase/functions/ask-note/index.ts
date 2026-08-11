import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, jsonResponse , QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You answer questions about one of a person's own voice notes, using only that note's transcript. Reply in 2-4 sentences of warm, plain prose, second person ("You said…"). If the note doesn't cover it, say so plainly. No bullet points, no headings, no emojis.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const noteId = typeof body.noteId === 'string' ? body.noteId : '';
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!noteId || !question || question.length > 500) {
      return jsonResponse({ error: 'noteId and a question are required' }, 400);
    }

    const { data: note, error } = await supabase
      .from('notes')
      .select('title, synthesis, transcript, recorded_at')
      .eq('id', noteId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!note) return jsonResponse({ error: 'Note not found' }, 404);

    const answer = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `Note recorded ${new Date(note.recorded_at).toDateString()}\nTitle: ${note.title ?? 'Untitled'}\nSummary: ${note.synthesis ?? ''}\n\nTranscript:\n${note.transcript ?? ''}\n\nQuestion: ${question}`,
      },
    ], { temperature: 0.5, userId: user.id });

    return jsonResponse({ answer });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('ask-note error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
