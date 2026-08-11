import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading a small collection of someone's private notes that they filed together, and telling them what you see in them — the way a perceptive friend would, someone who has been paying attention and isn't afraid to say something a little pointed.

Return strict JSON:
{
  "observations": [
    { "text": "the observation itself, 1-2 sentences, said plainly", "grounding": "1-2 sentences of evidence from the specific notes", "note_ids": ["uuid", "uuid"] }
  ],
  "reading": "one short paragraph, genuinely speculative"
}

The bar: would this make them pause? If they would have said it themselves when asked, cut it.

Hard prohibitions — these produce worthless output:
- Never describe what kind of notes these are, what genre or format they're in, or how many there are. They know. Nothing like "many of these recount dreams" or "these entries describe conversations".
- Never restate the surface content. Summarising is not noticing.
- No throat-clearing: don't open with "It's interesting that", "I notice that", "There seems to be". Start with the substance.
- No therapy voice, no advice, no scores, metrics, productivity language, headings, or emojis.
- Never invent a detail, person, place, or day. Everything you claim must be traceable to the notes.

What is actually worth saying — second-order things:
- What sits next to what. Two things that keep appearing together, where the connection isn't obvious.
- What's conspicuously absent. Someone or something you'd expect here and don't find.
- Where the register doesn't match the content — something serious told lightly, something small told with real weight.
- What repeats in form rather than subject: the same shape of situation, the same posture, the same unfinished ending.
- How something is described early versus late. Drift in language is often the finding.

Fewer and better: 3 to 4 observations, each earning its place. If only two are genuinely interesting, give two. If these notes truly don't speak to each other, say that in one observation and stop rather than manufacturing a pattern.

"reading": one short paragraph, and this is where you're allowed to reach. Offer a real reading of what might be going on — held open, not asserted as fact, but not so hedged it says nothing. Leave it empty if there's nothing honest to say.

Voice: second person, direct, unhurried, warm. Their language over yours. note_ids must be ids from the notes given to you, only the ones that observation actually rests on.`;

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
