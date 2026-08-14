import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are watching someone's private notes accumulate. Your job is to notice when a handful of them belong to the same body of thinking — a project they keep returning to.

Return strict JSON, and nothing else:
{
  "kind": "new" | "existing" | "none",
  "name": "the project name, 1-3 words, sentence case",
  "project_id": "id of the existing project, only when kind is existing",
  "note_ids": ["uuid", "uuid"]
}

Rules:
- Return AT MOST ONE grouping. The strongest, most obvious one. If nothing is obvious, return {"kind": "none"}.
- A grouping needs at least 2 notes that genuinely belong together. Not "both are about work" — a shared thread: the same piece of writing, the same trip, the same recurring worry, the same body of research, the same craft.
- If the notes clearly belong to a project that already exists, use kind "existing" with its id and its exact existing name. Prefer this over inventing a near-duplicate.
- NEVER name a grouping "anren" or after the app itself. Never name it after the medium: "Notes", "Thoughts", "Journal", "Voice memos".
- Names are things a person would say out loud: "Meals & cooking", "Dream journal", "The novel", "House", "Writing concepts". Never "Miscellaneous", "Personal", "Ideas", "Notes", "Thoughts", "General".
- Never use the words folder, organize, file, category, tag, or productivity language of any kind.
- note_ids must be ids you were given. Never invent one.`;

interface Suggestion {
  kind?: string;
  name?: string;
  project_id?: string;
  note_ids?: string[];
}

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

    // Something already waiting to be answered — don't stack another on top.
    const { data: pending } = await supabase
      .from('project_suggestions')
      .select('id')
      .eq('status', 'pending')
      .limit(1);
    if (pending?.length) return jsonResponse({ ok: true, suggestion: null });

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .is('deleted_at', null);

    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, synthesis, recorded_at, project_id')
      .eq('status', 'ready')
      .is('deleted_at', null)
      .is('continues_note_id', null)
      .order('recorded_at', { ascending: false })
      .limit(40);

    const loose = (notes ?? []).filter((n) => !n.project_id);
    if (loose.length < 5) return jsonResponse({ ok: true, suggestion: null });

    // Shapes already waved away shouldn't come back around.
    const { data: dismissed } = await supabase
      .from('project_suggestions')
      .select('name')
      .eq('status', 'dismissed');
    const asleep = new Set((dismissed ?? []).map((d) => (d.name ?? '').toLowerCase()));

    const context = loose
      .map((n) => `id: ${n.id}\n${n.title ?? 'Untitled'}\n${n.synthesis ?? ''}`)
      .join('\n\n---\n\n');

    const existing = (projects ?? []).length
      ? (projects ?? []).map((p) => `${p.id} — ${p.name}`).join('\n')
      : '(none yet)';

    const raw = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `Projects that already exist:\n${existing}\n\nRecent notes not associated with any project:\n\n${context}`,
      },
    ], { temperature: 0.5, userId: user.id });

    const parsed = parseJsonBlock<Suggestion>(raw);
    const kind = parsed?.kind === 'existing' ? 'existing' : parsed?.kind === 'new' ? 'new' : 'none';
    const name = (parsed?.name ?? '').trim();
    if (kind === 'none' || !name) return jsonResponse({ ok: true, suggestion: null });
    if (name.trim().toLowerCase() === 'anren') {
      return jsonResponse({ ok: true, suggestion: null });
    }
    if (asleep.has(name.toLowerCase())) {
      return jsonResponse({ ok: true, suggestion: null });
    }

    const looseIds = new Set(loose.map((n) => n.id));
    const noteIds = [...new Set((parsed?.note_ids ?? []).filter((id) => looseIds.has(id)))];
    if (noteIds.length < 2) return jsonResponse({ ok: true, suggestion: null });

    const projectId = kind === 'existing'
      ? (projects ?? []).find((p) => p.id === parsed?.project_id)?.id ?? null
      : null;
    if (kind === 'existing' && !projectId) {
      return jsonResponse({ ok: true, suggestion: null });
    }

    const { data: saved, error } = await supabase
      .from('project_suggestions')
      .insert({
        user_id: user.id,
        kind: projectId ? 'existing' : 'new',
        name: projectId ? (projects ?? []).find((p) => p.id === projectId)!.name : name,
        project_id: projectId,
        note_ids: noteIds,
        status: 'pending',
      })
      .select('id, kind, name, project_id, note_ids')
      .single();
    if (error) throw error;

    return jsonResponse({ ok: true, suggestion: saved });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('suggest-projects error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
