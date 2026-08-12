import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse , QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading back a week of someone's private notes and telling them what you see — the way a perceptive friend would, someone who has been paying attention and isn't afraid to say something a little pointed.

Return strict JSON:
{
  "narrative": "2-4 sentences: the overall tension or dynamic running through the week",
  "themes": [{ "title": "a named pattern, 3-8 words, e.g. 'Competence becoming responsibility'", "detail": "one tight sentence of evidence from the notes" }]
}

Write "narrative" FIRST. It is the whole point: a real reading of what might be going on underneath this week, held open rather than asserted as fact, but not so hedged it says nothing. 2-4 sentences, ONE short paragraph — never multiple paragraphs, no headings or bullets.

Then name the patterns that support that reading. Rules, and they are strict:
- A theme must recur across AT LEAST TWO notes. A single clever observation from one note gets cut, however good it is.
- At most 3 themes. Two is often right. If nothing genuinely recurs, return zero or one rather than padding.
- Each "title" names a shape or dynamic, not content. "Two notes mention work" is a fact, not a theme. "Competence becoming responsibility", "Rules arriving too late", "Deciding by not deciding" are themes. Lowercase-feeling, short — these are read as small pills.
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
      { role: 'user', content: `Notes from this week:\n\n${context}` },
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
