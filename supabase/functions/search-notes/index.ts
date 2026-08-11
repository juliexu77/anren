import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, embed, jsonResponse } from '../_shared/ai.ts';

const ANSWER_PROMPT = `You help someone reflect on what their own voice notes seem to suggest about a question they're holding. Using only the excerpts provided, answer in 2-4 sentences of warm, plain prose, second person, tentative voice ("You seem to…", "This may point to…"). Quote their own phrasing where it helps. If the excerpts don't answer it, say plainly that they haven't said much about it yet. No bullet points, no headings, no emojis.`;

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
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : null;
    const explain = body.explain === true;
    if (!query || query.length > 500) return jsonResponse({ error: 'A search query is required' }, 400);

    let queryEmbedding: string | null = null;
    try {
      const [vector] = await embed([query]);
      if (vector) queryEmbedding = JSON.stringify(vector);
    } catch (error) {
      console.error('query embedding failed:', (error as Error).message);
    }

    const { data: matches, error: searchError } = await supabase.rpc('hybrid_search_notes', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: 12,
      filter_project: projectId,
    });
    if (searchError) throw searchError;

    const rows = (matches ?? []) as { note_id: string; passage: string; score: number }[];
    if (!rows.length) return jsonResponse({ results: [], answer: null });

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, synthesis, recorded_at')
      .in('id', rows.map((r) => r.note_id))
      .is('deleted_at', null);
    if (notesError) throw notesError;

    const byId = new Map((notes ?? []).map((n) => [n.id, n]));
    const results = rows
      .filter((row) => byId.has(row.note_id))
      .map((row) => {
        const note = byId.get(row.note_id)!;
        return {
          note_id: row.note_id,
          title: note.title,
          synthesis: note.synthesis,
          snippet: row.passage,
          recorded_at: note.recorded_at,
        };
      });

    if (!explain) {
      return jsonResponse({ results, answer: null });
    }

    let answer: string | null = null;
    try {
      const context = results
        .slice(0, 6)
        .map((r) => `— ${r.title ?? 'Untitled'} (${new Date(r.recorded_at).toDateString()}): ${r.snippet ?? r.synthesis ?? ''}`)
        .join('\n\n');
      answer = await chat([
        { role: 'system', content: ANSWER_PROMPT },
        { role: 'user', content: `Question: ${query}\n\nExcerpts from their notes:\n\n${context}` },
      ], { temperature: 0.5 });
    } catch (error) {
      console.error('answer generation failed:', (error as Error).message);
    }

    return jsonResponse({ results, answer });
  } catch (error) {
    console.error('search-notes error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
