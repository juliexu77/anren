import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, embed, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You help someone think about their own voice notes. You only know what the excerpts below contain — nothing else about their life.

Answer in 2-5 sentences of warm, plain prose, second person. Quote their own phrasing where it earns its place. Stay tentative where the notes are tentative ("You seem to…", "This may be…"). If the excerpts don't speak to the question, say so plainly rather than inventing an answer.

No bullet points, no headings, no emojis, no therapy voice, no advice unless they asked for it.`;

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
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 500) {
      return jsonResponse({ error: 'A question is required' }, 400);
    }

    const history = (Array.isArray(body.history) ? body.history : [])
      .slice(-4)
      .filter((turn: unknown): turn is { question: string; answer: string } => {
        const t = turn as { question?: unknown; answer?: unknown };
        return typeof t?.question === 'string' && typeof t?.answer === 'string';
      })
      .map((turn: { question: string; answer: string }) => ({
        question: turn.question.slice(0, 500),
        answer: turn.answer.slice(0, 2000),
      }));

    // Retrieval first: the answer may only lean on words they actually left.
    let queryEmbedding: string | null = null;
    try {
      const [vector] = await embed([question]);
      if (vector) queryEmbedding = JSON.stringify(vector);
    } catch (error) {
      console.error('query embedding failed:', (error as Error).message);
    }

    const { data: matches, error: searchError } = await supabase.rpc('hybrid_search_notes', {
      query_text: question,
      query_embedding: queryEmbedding,
      match_count: 12,
      filter_project: null,
    });
    if (searchError) throw searchError;

    const rows = (matches ?? []) as { note_id: string; passage: string; score: number }[];
    if (!rows.length) {
      return jsonResponse({ answer: "You haven't left anything that speaks to this yet.", sources: [] });
    }

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, synthesis, recorded_at')
      .in('id', rows.map((r) => r.note_id))
      .is('deleted_at', null);
    if (notesError) throw notesError;

    const byId = new Map((notes ?? []).map((n) => [n.id, n]));
    const kept = rows.filter((row) => byId.has(row.note_id)).slice(0, 8);
    if (!kept.length) {
      return jsonResponse({ answer: "You haven't left anything that speaks to this yet.", sources: [] });
    }

    // The week's themes give the answer somewhere to stand beyond the excerpts.
    const { data: digest } = await supabase
      .from('weekly_digests')
      .select('narrative, themes')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    const excerpts = kept
      .map((row) => {
        const note = byId.get(row.note_id)!;
        const when = new Date(note.recorded_at as string).toDateString();
        return `— "${note.title ?? 'Untitled'}" (${when}): ${row.passage ?? note.synthesis ?? ''}`;
      })
      .join('\n\n');

    const themeLine = digest?.themes && Array.isArray(digest.themes) && digest.themes.length
      ? `\n\nWhat's been coming up lately: ${(digest.themes as { title?: string }[])
          .map((t) => t?.title)
          .filter(Boolean)
          .join(', ')}`
      : '';

    const messages = [
      { role: 'system', content: PROMPT },
      ...history.flatMap((turn: { question: string; answer: string }) => [
        { role: 'user', content: turn.question },
        { role: 'assistant', content: turn.answer },
      ]),
      {
        role: 'user',
        content: `Excerpts from their notes:\n\n${excerpts}${themeLine}\n\nTheir question: ${question}`,
      },
    ];

    const answer = await chat(messages, { temperature: 0.6, userId: user.id });

    const seen = new Set<string>();
    const sources = kept
      .filter((row) => !seen.has(row.note_id) && seen.add(row.note_id))
      .slice(0, 5)
      .map((row) => ({ noteId: row.note_id, title: byId.get(row.note_id)!.title ?? null }));

    return jsonResponse({ answer, sources });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('ask-notes error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
