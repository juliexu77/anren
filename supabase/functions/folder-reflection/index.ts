import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse , QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading a small collection of someone's private notes that they filed together, and telling them what you see — the way a perceptive friend would, someone who has been paying attention and isn't afraid to say something a little pointed.

Return strict JSON:
{
  "reading": "2-4 sentences: the overall tension or dynamic running through these notes",
  "observations": [
    { "text": "a vibe in 1-2 words, e.g. 'unchosen rooms'", "grounding": "one tight sentence of evidence from the notes", "note_ids": ["uuid"] }
  ]
}

Write "reading" FIRST. It is the whole point: a real reading of what might be going on underneath these notes, held open rather than asserted as fact, but not so hedged it says nothing. 2-4 sentences. Leave it empty only if there is nothing honest to say.

Then the "observations" — these render as small tappable pills, like mood or vibe tags in a consumer app. Think of them together, as a set: read side by side they should give the aura of this collection, the atmosphere a stranger would feel flipping through it. Individually each is just a word or two; collectively they are the portrait.

Rules for the pills:
- Return 4 to 7 of them. Fewer only if the collection is genuinely thin.
- ONE OR TWO WORDS ONLY — never three. All lowercase, no punctuation. If it doesn't fit in two words, find a sharper word.
- Mix registers: some name a mood or texture ("low static", "held breath", "warm dread"), some a recurring shape or dynamic ("unchosen rooms", "late rules", "failing tools"), some an object or image that keeps returning if it genuinely does.
- A pill does not have to recur across notes. A single note can supply a vibe. But it must be traceable — note_ids lists the notes it rests on, at least one.
- Never a topic label ("work", "family", "dreams") and never a fact ("two mention water"). A pill is felt, not filed.
- "grounding" is ONE sentence of evidence. It sits behind a tap, so it is citation, not prose.

Hard prohibitions — these produce worthless output:
- Never describe what kind of notes these are, what genre or format they're in, or how many there are. They know. Nothing like "many of these recount dreams".
- Never restate the surface content. Summarising is not noticing.
- No throat-clearing: don't open with "It's interesting that", "I notice that", "There seems to be". Start with the substance.
- No therapy voice, no advice, no scores, metrics, productivity language, headings, or emojis.
- Never invent a detail, person, place, or day. Everything you claim must be traceable to the notes.

Voice: second person, direct, unhurried, warm. Their language over yours. note_ids must be ids from the notes given to you.`;

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
    ], { temperature: 0.7, userId: user.id });

    const parsed = parseJsonBlock<Reflection>(raw);
    if (!parsed) throw new Error('Could not gather anything from these notes');
    if (!parsed.observations?.length && !parsed.reading?.trim()) {
      throw new Error('Could not gather anything from these notes');
    }

    const validIds = new Set(notes.map((n) => n.id));
    const observations = (parsed.observations ?? [])
      .filter((o) => o?.text)
      .map((o) => ({
        text: o.text,
        grounding: o.grounding ?? '',
        note_ids: [...new Set((o.note_ids ?? []).filter((id) => validIds.has(id)))],
      }))
      .filter((o) => o.note_ids.length >= 1)
      .slice(0, 7);


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
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('folder-reflection error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
