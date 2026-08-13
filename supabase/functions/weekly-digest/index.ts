import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse , QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading back a week of someone's private notes and telling them what you see — the way a perceptive friend would, someone who has been paying attention and isn't afraid to say something a little pointed.

You are also given the names of their projects (things they deliberately keep) and their threads (loose groupings that have been accumulating on their own). Those names are the shared vocabulary of this app: use them literally, and never invent a name that isn't in the list.

Return strict JSON:
{
  "movements": [{ "name": "the exact project or thread name", "moved": "one short sentence: what happened here this week" }],
  "tension": "one or two sentences naming a place where two of these pull against each other — or null if nothing genuinely does",
  "narrative": "2-4 sentences: the overall dynamic running through the week",
  "themes": [{ "title": "a vibe in 1-2 words, e.g. 'borrowed urgency'", "detail": "one tight sentence of evidence from the notes" }]
}

"movements" comes first and matters most: 2-4 of them, only for names that actually moved this week, ordered by how much they moved. Say what moved in their terms — "pulled ahead", "is still just loose notes", "went quiet after Tuesday". Never a count, never a metric. Omit a name entirely rather than padding it.

"tension" is anren's edge over a summary: two named things pulling in opposite directions (a bold move against financial caution, wanting out while deepening in). Only when it's really there in the notes. Otherwise null.

Then "narrative": a real reading of what might be going on underneath this week, held open rather than asserted as fact, but not so hedged it says nothing. Name projects and threads where it helps. 2-4 sentences, ONE short paragraph — never multiple paragraphs, no headings or bullets.

Then the "themes" — these render as small tappable pills, like mood or vibe tags in a consumer app. Think of them together, as a set: read side by side they should give the aura of the week, the atmosphere a stranger would feel flipping through it. Individually each is just a word or two; collectively they are the portrait.

Rules for the pills:
- Return 4 to 7 of them. Fewer only if the week is genuinely thin.
- Each "title" is ONE OR TWO WORDS ONLY — never three. All lowercase, no punctuation. If it doesn't fit in two words, find a sharper word.
- Mix registers: some name a mood or texture ("low static", "held breath", "warm dread"), some a recurring shape or dynamic ("borrowed urgency", "late rules", "quiet deferral"), some an image or object that keeps returning if it genuinely does.
- A pill does not have to recur across notes. A single note can supply a vibe. But it must be traceable to something actually in the notes.
- Never a topic label ("work", "family") and never a fact ("two notes mention work"). A pill is felt, not filed.
- "detail" is ONE sentence of evidence. It sits behind a tap, so it is citation, not prose.

Hard prohibitions — these produce worthless output:
- Never restate the surface content. Summarising is not noticing. If a sentence could be replaced by re-reading the notes, cut it.
- Never describe what kind of notes these are, what format they're in, or how many there are. They know.
- No throat-clearing: don't open with "It's interesting that", "I notice that", "There seems to be". Start with the substance.
- No therapy voice, no advice unless they asked for it in a note, no scores, metrics, productivity language, or emojis.
- Never invent a detail, person, place, or day. Only name a weekday if a note is from that day.

What is actually worth naming — second-order things: what keeps appearing next to what; what's conspicuously absent; where the emotional register doesn't match the content; what repeats in form rather than subject; how something is described early in the week versus late; what they keep circling and leave unfinished.

Voice: second person, direct, unhurried, warm. Their language over yours. Hedge the reading with "seem to", "may be", "keep returning to" where it's genuinely uncertain — not everywhere.`;


interface Digest {
  narrative: string;
  tension?: string | null;
  movements?: { name: string; moved: string }[];
  themes: { title: string; detail: string }[];
}

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
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

    const weekStart = mondayOf();

    const { data: notes, error } = await supabase
      .from('notes')
      .select('title, synthesis, transcript, recorded_at')
      .eq('status', 'ready')
      .is('deleted_at', null)
      .gte('recorded_at', `${weekStart}T00:00:00Z`)
      .order('recorded_at', { ascending: true });
    if (error) throw error;

    if (!notes?.length) {
      return jsonResponse({ error: 'No notes this week yet' }, 400);
    }

    const [{ data: projects }, { data: threads }] = await Promise.all([
      supabase.from('projects').select('name').is('deleted_at', null),
      supabase.from('threads').select('name').eq('status', 'active'),
    ]);

    const shape = [
      (projects ?? []).length
        ? `Their projects: ${(projects ?? []).map((p) => p.name).join(', ')}`
        : 'They keep no projects yet.',
      (threads ?? []).length
        ? `Loose threads anren has noticed: ${(threads ?? []).map((t) => t.name).join(', ')}`
        : 'No loose threads noticed yet.',
    ].join('\n');

    const context = notes
      .map((n) => {
        const day = new Date(n.recorded_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
        return `[${day}] ${n.title ?? 'Untitled'}\n${n.synthesis ?? ''}\n${(n.transcript ?? '').slice(0, 2500)}`;
      })
      .join('\n\n---\n\n');

    const raw = await chat([
      { role: 'system', content: PROMPT },
      { role: 'user', content: `${shape}\n\nNotes from this week:\n\n${context}` },
    ], { temperature: 0.7, userId: user.id });

    const parsed = parseJsonBlock<Digest>(raw);
    if (!parsed?.narrative) throw new Error('Could not compose the digest');

    await supabase
      .from('weekly_digests')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .is('project_id', null);

    const { data: saved, error: saveError } = await supabase
      .from('weekly_digests')
      .insert({
        user_id: user.id,
        week_start: weekStart,
        narrative: parsed.narrative,
        tension: typeof parsed.tension === 'string' && parsed.tension.trim() ? parsed.tension.trim() : null,
        movements: Array.isArray(parsed.movements) ? parsed.movements.slice(0, 4) : [],
        themes: parsed.themes ?? [],
        notes_analyzed: notes.length,
      })
      .select('id')
      .single();
    if (saveError) throw saveError;

    return jsonResponse({ ok: true, id: saved.id, notesAnalyzed: notes.length });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('weekly-digest error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
