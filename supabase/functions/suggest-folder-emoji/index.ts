import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, jsonResponse } from '../_shared/ai.ts';

const NEUTRAL = '📁';

const KEYWORD_FALLBACKS: [RegExp, string][] = [
  [/mom|dad|family|kids|baby|parent/i, '🏡'],
  [/friend|people|social|circle/i, '🫂'],
  [/work|job|career|office|meeting/i, '💼'],
  [/money|finance|budget|tax|invest/i, '💰'],
  [/health|doctor|therapy|body|sleep/i, '🌿'],
  [/gym|run|train|workout|fitness/i, '🏃'],
  [/idea|thought|brainstorm|concept/i, '💡'],
  [/book|read|write|writing|essay|journal/i, '📖'],
  [/travel|trip|flight|vacation/i, '✈️'],
  [/home|house|apartment|move|moving/i, '🏠'],
  [/food|cook|recipe|kitchen|eat/i, '🍳'],
  [/music|song|album|guitar/i, '🎧'],
  [/art|design|draw|paint/i, '🎨'],
  [/school|study|class|course|learn/i, '🎓'],
  [/plan|goal|future|dream/i, '🧭'],
  [/community|group|club|space/i, '🪴'],
];

/** True when the string is a short, single visible emoji-ish mark. */
function isEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const graphemes = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(trimmed)];
  if (graphemes.length !== 1) return false;
  return /\p{Extended_Pictographic}/u.test(trimmed);
}

function keywordFallback(name: string): string {
  for (const [pattern, emoji] of KEYWORD_FALLBACKS) {
    if (pattern.test(name)) return emoji;
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
      const reply = await chat(
        [
          {
            role: 'system',
            content:
              'You pick a single emoji that quietly represents a personal folder name. ' +
              'Warm, plain, literal choices over clever ones. Avoid faces unless the name is about a feeling. ' +
              'Never use flags. Respond with JSON only, no prose, in the shape ' +
              '{"emoji":"<one emoji>","alternates":["<emoji>","<emoji>","<emoji>"]}.',
          },
          { role: 'user', content: `Folder name: ${rawName}` },
        ],
        { temperature: 0.3 },
      );

      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { emoji?: unknown; alternates?: unknown };
        if (typeof parsed.emoji === 'string' && isEmoji(parsed.emoji)) primary = parsed.emoji.trim();
        if (Array.isArray(parsed.alternates)) {
          alternates = parsed.alternates
            .filter((a): a is string => typeof a === 'string' && isEmoji(a))
            .map((a) => a.trim())
            .slice(0, 3);
        }
      }
    } catch (err) {
      console.error('emoji suggestion failed:', err instanceof Error ? err.message : err);
    }

    const emoji = primary || fallback;
    const unique = [...new Set(alternates.filter((a) => a !== emoji))].slice(0, 3);
    if (!unique.length && fallback !== emoji) unique.push(fallback);

    return jsonResponse({ emoji, alternates: unique });
  } catch (err) {
    console.error('suggest-folder-emoji error:', err);
    return jsonResponse({ emoji: NEUTRAL, alternates: [] });
  }
});
