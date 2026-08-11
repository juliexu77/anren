import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/ai.ts';

const MIN_SIMILARITY = 0.78;

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
    if (!noteId) return jsonResponse({ error: 'noteId is required' }, 400);

    // Confirm ownership
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (noteError) throw noteError;
    if (!note) return jsonResponse({ error: 'Note not found' }, 404);

    // Mean-pool this note's passage embeddings.
    const { data: passages, error: passagesError } = await supabase
      .from('note_passages')
      .select('embedding')
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .not('embedding', 'is', null);
    if (passagesError) throw passagesError;

    if (!passages?.length) {
      return jsonResponse({ related: [] });
    }

    const vectors = passages
      .map((p) => {
        try {
          return JSON.parse(p.embedding!) as number[];
        } catch {
          return null;
        }
      })
      .filter((v): v is number[] => v !== null && v.length > 0);

    if (!vectors.length) {
      return jsonResponse({ related: [] });
    }

    const dims = vectors[0].length;
    const pooled = new Array(dims).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dims; i++) pooled[i] += v[i];
    }
    for (let i = 0; i < dims; i++) pooled[i] /= vectors.length;

    // Find similar passages from other notes, then pick the best per note.
    const { data: matches, error: searchError } = await supabase.rpc('match_passages', {
      query_embedding: JSON.stringify(pooled),
      match_threshold: MIN_SIMILARITY,
      match_count: 20,
      exclude_note_id: noteId,
    });
    if (searchError) throw searchError;

    const rows = (matches ?? []) as { note_id: string; similarity: number }[];
    const seen = new Set<string>();
    const relatedIds: string[] = [];
    for (const row of rows) {
      if (seen.has(row.note_id)) continue;
      seen.add(row.note_id);
      relatedIds.push(row.note_id);
      if (relatedIds.length >= 4) break;
    }

    if (!relatedIds.length) {
      return jsonResponse({ related: [] });
    }

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, recorded_at')
      .in('id', relatedIds)
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false });
    if (notesError) throw notesError;

    const byId = new Map((notes ?? []).map((n) => [n.id, n]));
    const related = relatedIds
      .map((id) => {
        const n = byId.get(id);
        if (!n) return null;
        return {
          note_id: n.id,
          title: n.title,
          recorded_at: n.recorded_at,
        };
      })
      .filter(Boolean);

    return jsonResponse({ related });
  } catch (error) {
    console.error('related-notes error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
