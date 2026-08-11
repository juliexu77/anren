import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, jsonResponse } from '../_shared/ai.ts';

const PREFIX = 'glyph:';
const NEUTRAL = 'circle';

/** Keys must stay in sync with src/components/folder-glyphs.tsx */
const GLYPHS: Record<string, string> = {
  circle: 'a plain stone circle — neutral, unnamed',
  kite: 'a kite — play, wind, something let loose',
  moth: 'a moth — drawn toward a light, restless',
  teapot: 'a pot of tea — care, warmth, someone you love',
  plane: 'a paper plane — sending, messages, leaving',
  knot: 'a knot — tangle, something unresolved',
  doorway: 'a doorway — thresholds, places, arriving',
  sprout: 'a sprout — beginnings, growth, tending',
  bell: 'a bell — attention, reminders, ritual',
  spool: 'a spool of thread — long-running, wound up',
  moon: 'a moon — night, dreams, quiet hours',
  ladder: 'a ladder — steps, climbing, ambition',
  wave: 'a wave — mood, tides, coming and going',
  eye: 'an eye — noticing, watching, observation',
  key: 'a key — access, work, unlocking',
  match: 'a struck match — burnout, urgency, a flare',
  shell: 'a shell — memory, keeping, the sea',
  feather: 'a feather — writing, lightness',
  bowl: 'a bowl — food, gathering, holding',
  lamp: 'a lamp — ideas, study, late thinking',
  books: 'a stack of books — reading, learning',
  envelope: 'an envelope — letters, admin, correspondence',
  clock: 'a clock face — time, waiting, schedules',
  compass: 'a compass — direction, plans, the future',
  fish: 'a fish — slipping away, instinct, depths',
  house: 'a small house — home, family, domestic life',
  needle: 'thread and needle — repair, craft, small fixes',
  mountain: 'a mountain — effort, distance, something large',
  cup: 'a cup — daily habit, coffee, small comfort',
};

const KEYWORD_FALLBACKS: [RegExp, string][] = [
  [/mom|dad|family|kids|baby|parent/i, 'teapot'],
  [/friend|people|social|circle/i, 'bowl'],
  [/work|job|career|office|meeting/i, 'key'],
  [/money|finance|budget|tax|invest/i, 'ladder'],
  [/burn|tired|stress|overwhelm|anxious/i, 'match'],
  [/health|doctor|therapy|body|sleep/i, 'sprout'],
  [/gym|run|train|workout|fitness/i, 'mountain'],
  [/idea|thought|brainstorm|concept/i, 'lamp'],
  [/book|read|write|writing|essay|journal/i, 'feather'],
  [/travel|trip|flight|vacation/i, 'plane'],
  [/home|house|apartment|move|moving/i, 'house'],
  [/food|cook|recipe|kitchen|eat/i, 'bowl'],
  [/music|song|album|guitar/i, 'bell'],
  [/art|design|draw|paint/i, 'needle'],
  [/school|study|class|course|learn/i, 'books'],
  [/plan|goal|future|dream/i, 'compass'],
  [/dream|night|sleep|moon/i, 'moon'],
  [/community|group|club|space|coworking/i, 'doorway'],
  [/mood|feeling|emotion|notice/i, 'wave'],
];

function keywordFallback(name: string): string {
  for (const [pattern, glyph] of KEYWORD_FALLBACKS) {
    if (pattern.test(name)) return glyph;
  }
  return NEUTRAL;
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
    const rawName = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!rawName) return jsonResponse({ error: 'name is required' }, 400);

    const fallback = keywordFallback(rawName);

    let primary = '';
    let alternates: string[] = [];

    try {
      const catalogue = Object.entries(GLYPHS)
        .map(([key, sense]) => `${key} — ${sense}`)
        .join('\n');

      const reply = await chat(
        [
          {
            role: 'system',
            content:
              'You choose a small hand-drawn ink mark for a personal folder name. ' +
              'Prefer the slightly oblique choice over the obvious one — a mark that reads as a quiet ' +
              'observation about the folder rather than a label for it. Never explain yourself. ' +
              'Only ever use keys from this list:\n' + catalogue + '\n' +
              'Respond with JSON only, no prose, in the shape ' +
              '{"glyph":"<key>","alternates":["<key>","<key>","<key>"]}.',
          },
          { role: 'user', content: `Folder name: ${rawName}` },
        ],
        { temperature: 0.6, userId: user.id },
      );

      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { glyph?: unknown; alternates?: unknown };
        if (typeof parsed.glyph === 'string' && GLYPHS[parsed.glyph.trim()]) primary = parsed.glyph.trim();
        if (Array.isArray(parsed.alternates)) {
          alternates = parsed.alternates
            .filter((a): a is string => typeof a === 'string' && !!GLYPHS[a.trim()])
            .map((a) => a.trim())
            .slice(0, 3);
        }
      }
    } catch (err) {
      console.error('glyph suggestion failed:', err instanceof Error ? err.message : err);
    }

    const glyph = primary || fallback;
    const unique = [...new Set(alternates.filter((a) => a !== glyph))].slice(0, 3);
    if (!unique.length && fallback !== glyph) unique.push(fallback);

    return jsonResponse({
      emoji: `${PREFIX}${glyph}`,
      alternates: unique.map((a) => `${PREFIX}${a}`),
    });
  } catch (err) {
    console.error('suggest-folder-emoji error:', err);
    return jsonResponse({ emoji: `${PREFIX}${NEUTRAL}`, alternates: [] });
  }
});
