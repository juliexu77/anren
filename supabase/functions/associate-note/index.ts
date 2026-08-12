import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You decide whether a single note clearly belongs to one of the bodies of thinking a person already keeps.

Return strict JSON:
{ "project_id": "id or null", "confident": true | false }

Rules:
- Say yes only when it is obvious — the same piece of work, the same trip, the same recurring subject, the same craft as that project holds.
- A loose topical overlap is not enough. When unsure, return null with confident false.
- project_id must be one of the ids given to you.`;

interface Verdict {
  project_id?: string | null;
  confident?: boolean;
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

    const body = await req.json().catch(() => ({}));
    const noteId = typeof body?.noteId === 'string' ? body.noteId : null;
    if (!noteId) return jsonResponse({ error: 'noteId is required' }, 400);

    const { data: note } = await supabase
      .from('notes')
      .select('id, title, synthesis, transcript, body, project_id')
      .eq('id', noteId)
      .maybeSingle();
    if (!note) return jsonResponse({ error: 'Note not found' }, 404);
    // Already associated — the person's own choice stands.
    if (note.project_id) return jsonResponse({ ok: true, projectId: note.project_id });

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .is('deleted_at', null);
    if (!projects?.length) return jsonResponse({ ok: true, projectId: null });

    // What each project currently holds, so the match is about substance.
    const summaries: string[] = [];
    for (const p of projects) {
      const { data: held } = await supabase
        .from('notes')
        .select('title, synthesis')
        .eq('project_id', p.id)
        .is('deleted_at', null)
        .order('recorded_at', { ascending: false })
        .limit(5);
      const lines = (held ?? [])
        .map((h) => `- ${h.title ?? 'Untitled'}: ${(h.synthesis ?? '').slice(0, 200)}`)
        .join('\n');
      summaries.push(`${p.id} — ${p.name}\n${lines || '(nothing in it yet)'}`);
    }

    const text = (note.synthesis ?? '') + '\n\n' + (note.transcript ?? note.body ?? '').slice(0, 2000);

    const raw = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `Existing projects:\n\n${summaries.join('\n\n')}\n\nThe new note:\n${note.title ?? 'Untitled'}\n${text}`,
      },
    ], { temperature: 0.2, userId: user.id });

    const parsed = parseJsonBlock<Verdict>(raw);
    const match = parsed?.confident && parsed?.project_id
      ? projects.find((p) => p.id === parsed.project_id)?.id ?? null
      : null;
    if (!match) return jsonResponse({ ok: true, projectId: null });

    await supabase
      .from('notes')
      .update({ project_id: match, auto_filed_at: new Date().toISOString() })
      .eq('id', noteId);

    return jsonResponse({ ok: true, projectId: match });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('associate-note error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
