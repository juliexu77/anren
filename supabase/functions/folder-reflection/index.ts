import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse } from '../_shared/ai.ts';

const PROMPT = `You read back a small collection of someone's private notes that they filed together under one folder, and you point out what you notice across them.

Return strict JSON:
{
  "observations": [
    { "text": "one short sentence naming what recurs", "grounding": "1-2 sentences pointing at the specific notes it comes from", "note_ids": ["uuid", "uuid"] }
  ],
  "reading": "one short paragraph, more speculative, hedged"
}

Rules for observations:
- 3 to 5 of them. Each must be grounded in details actually present in the notes. Never invent a detail, a person, a place, or a day.
- Name what recurs, what shifted, what keeps sitting next to something else. Stay close to factual: "Houses appear in two of these", "Safety and threat keep surfacing", "Unfamiliar spaces show up alongside trying to orient yourself".
- No interpretation here. No advice. No headings, scores, metrics, productivity language, or emojis.
- note_ids must be ids from the notes given to you, only the ones that observation actually draws on.

Rules for "reading":
- This is the only place interpretation is allowed, and it stays tentative: "seem to", "might be", "one way to read this".
- Never tell them what something means or what they are. Offer a possible reading and leave it open.
- Omit it (empty string) if the notes are thin or genuinely unrelated.

Voice: second person, warm, unhurried, plain. If the notes don't relate to each other, say that plainly in one observation and stop rather than manufacturing a pattern.`;

interface Observation {
  text: string;
  grounding?: string;
  note_ids?: string[];
}

interface Reflection {
  observations: Observation[];
  reading?: string;
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
    const projectId = typeof body?.projectId === 'string' ? body.projectId : null;
    if (!projectId) return jsonResponse({ error: 'projectId is required' }, 400);

    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, title, synthesis, transcript, body, recorded_at')
      .eq('project_id', projectId)
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('recorded_at', { ascending: true });
    if (error) throw error;

    if (!notes || notes.length < 2) {
      return jsonResponse({ error: 'Not enough notes here yet' }, 400);
    }

    const context = notes
      .map((n) => {
        const day = new Date(n.recorded_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
        const words = (n.transcript ?? n.body ?? '').slice(0, 3000);
        return `id: ${n.id}\n[${day}] ${n.title ?? 'Untitled'}\n${n.synthesis ?? ''}\n${words}`;
      })
      .join('\n\n---\n\n');

    const raw = await chat([
      { role: 'system', content: PROMPT },
      { role: 'user', content: `Notes filed in this folder:\n\n${context}` },
    ], { temperature: 0.7 });

    const parsed = parseJsonBlock<Reflection>(raw);
    if (!parsed?.observations?.length) throw new Error('Could not gather anything from these notes');

    const validIds = new Set(notes.map((n) => n.id));
    const observations = parsed.observations
      .filter((o) => o?.text)
      .map((o) => ({
        text: o.text,
        grounding: o.grounding ?? '',
        note_ids: (o.note_ids ?? []).filter((id) => validIds.has(id)),
      }));

    const { data: saved, error: saveError } = await supabase
      .from('folder_reflections')
      .upsert({
        user_id: user.id,
        project_id: projectId,
        observations,
        reading: parsed.reading?.trim() || null,
        notes_analyzed: notes.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,project_id' })
      .select('id')
      .single();
    if (saveError) throw saveError;

    return jsonResponse({ ok: true, id: saved.id, notesAnalyzed: notes.length });
  } catch (error) {
    console.error('folder-reflection error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
