import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You decide where a single note belongs — either in one of the bodies of thinking the person deliberately keeps (a project), or alongside a loose grouping that has been quietly accumulating (a thread).

Return strict JSON:
{ "project_id": "id or null", "thread_id": "id or null", "confident": true | false }

Rules:
- Prefer a project when it is obvious — the same piece of work, the same trip, the same recurring subject, the same craft as that project holds.
- Only if no project fits, consider the threads. A thread match means this note is more of the same thinking that grouping is made of.
- A loose topical overlap is not enough. When unsure, return nulls with confident false.
- Never return both. ids must be ones given to you.`;

const CLUSTER_PROMPT = `You decide whether a loose grouping of notes belongs inside one of the projects a person already keeps.

Return strict JSON:
{ "project_id": "id or null", "confident": true | false }

Say yes only when the grouping is plainly more of what that project already holds. A loose topical overlap is not enough — when unsure, return null with confident false. project_id must be one of the ids given to you.`;

interface Verdict {
  project_id?: string | null;
  thread_id?: string | null;
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
    const threadId = typeof body?.threadId === 'string' ? body.threadId : null;
    if (!noteId && !threadId) return jsonResponse({ error: 'noteId or threadId is required' }, 400);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .is('deleted_at', null);

    /** What each project currently holds, so any match is about substance. */
    const projectContext = async () => {
      const summaries: string[] = [];
      for (const p of projects ?? []) {
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
      return summaries.join('\n\n');
    };

    // ── Does a loose grouping belong in a project the person already keeps?
    if (threadId) {
      if (!projects?.length) return jsonResponse({ ok: true, projectId: null });

      const { data: thread } = await supabase
        .from('threads')
        .select('id, name, note_ids, project_id, status')
        .eq('id', threadId)
        .maybeSingle();
      if (!thread) return jsonResponse({ error: 'Thread not found' }, 404);

      const ids = (thread.note_ids ?? []) as string[];
      const { data: held } = await supabase
        .from('notes')
        .select('title, synthesis, project_id')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
        .is('deleted_at', null);

      const loose = (held ?? []).filter((n) => !n.project_id);
      if (loose.length < 2) return jsonResponse({ ok: true, projectId: null });

      const clusterText = loose
        .map((n) => `- ${n.title ?? 'Untitled'}: ${(n.synthesis ?? '').slice(0, 240)}`)
        .join('\n');

      const raw = await chat([
        { role: 'system', content: CLUSTER_PROMPT },
        {
          role: 'user',
          content: `Existing projects:\n\n${await projectContext()}\n\nThe loose grouping — "${thread.name}":\n${clusterText}`,
        },
      ], { temperature: 0.2, userId: user.id });

      const parsed = parseJsonBlock<Verdict>(raw);
      const match = parsed?.confident && parsed?.project_id
        ? projects.find((p) => p.id === parsed.project_id) ?? null
        : null;

      return jsonResponse({
        ok: true,
        projectId: match?.id ?? null,
        projectName: match?.name ?? null,
      });
    }

    // ── Where does this one note land?
    const { data: note } = await supabase
      .from('notes')
      .select('id, title, synthesis, transcript, body, project_id')
      .eq('id', noteId!)
      .maybeSingle();
    if (!note) return jsonResponse({ error: 'Note not found' }, 404);
    // Already associated — the person's own choice stands.
    if (note.project_id) {
      const named = (projects ?? []).find((p) => p.id === note.project_id);
      return jsonResponse({
        ok: true,
        projectId: note.project_id,
        projectName: named?.name ?? null,
        alreadyFiled: true,
      });
    }

    const { data: threads } = await supabase
      .from('threads')
      .select('id, name, blurb, note_ids')
      .eq('status', 'active')
      .order('last_seen_at', { ascending: false })
      .limit(8);

    if (!projects?.length && !threads?.length) return jsonResponse({ ok: true, projectId: null });

    const threadContext = (threads ?? [])
      .map((t) => `${t.id} — ${t.name} (${(t.note_ids ?? []).length} notes)\n${t.blurb ?? ''}`)
      .join('\n\n');

    const text = (note.synthesis ?? '') + '\n\n' + (note.transcript ?? note.body ?? '').slice(0, 2000);

    const raw = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content:
          `Existing projects:\n\n${projects?.length ? await projectContext() : '(none)'}\n\n` +
          `Loose groupings already noticed:\n\n${threadContext || '(none)'}\n\n` +
          `The new note:\n${note.title ?? 'Untitled'}\n${text}`,
      },
    ], { temperature: 0.2, userId: user.id });

    const parsed = parseJsonBlock<Verdict>(raw);
    const confident = Boolean(parsed?.confident);

    const project = confident && parsed?.project_id
      ? (projects ?? []).find((p) => p.id === parsed.project_id) ?? null
      : null;

    if (project) {
      await supabase
        .from('notes')
        .update({ project_id: project.id, auto_filed_at: new Date().toISOString() })
        .eq('id', noteId!);
      return jsonResponse({ ok: true, projectId: project.id, projectName: project.name });
    }

    const thread = confident && parsed?.thread_id
      ? (threads ?? []).find((t) => t.id === parsed.thread_id) ?? null
      : null;

    if (thread) {
      const ids = [...new Set([...(thread.note_ids ?? []) as string[], noteId!])];
      await supabase
        .from('threads')
        .update({ note_ids: ids, last_seen_at: new Date().toISOString() })
        .eq('id', thread.id);
      return jsonResponse({
        ok: true,
        projectId: null,
        threadId: thread.id,
        threadName: thread.name,
        threadNoteCount: ids.length,
      });
    }

    return jsonResponse({ ok: true, projectId: null });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('associate-note error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
