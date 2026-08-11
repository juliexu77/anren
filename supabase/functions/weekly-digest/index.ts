import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse } from '../_shared/ai.ts';

const PROMPT = `You read back a week of someone's private voice notes and tell them what's been on their mind.

Return strict JSON:
{
  "narrative": "3-5 short paragraphs of flowing prose, second person, no headings or bullets",
  "themes": [{ "title": "short phrase in their own language", "detail": "1-2 sentences" }]
}

Rules:
- Only reference things actually present in the notes. Never invent a day, person, or event, and only name a weekday if a note is from that day.
- Notice what recurs, what shifted, what they keep circling back to, and what they left unfinished.
- Warm, observant, unhurried — like a friend who listened closely. Second person throughout.
- No advice unless they asked for it in a note. No scores, metrics, productivity language, or emojis.
- 2-4 themes. If the week is thin, say that plainly and keep it short.`;

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
    ], { temperature: 0.7 });

    const parsed = parseJsonBlock<Digest>(raw);
    if (!parsed?.narrative) throw new Error('Could not compose the digest');

    const { data: saved, error: saveError } = await supabase
      .from('weekly_digests')
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          narrative: parsed.narrative,
          themes: parsed.themes ?? [],
          notes_analyzed: notes.length,
        },
        { onConflict: 'user_id,week_start' },
      )
      .select('id')
      .single();
    if (saveError) throw saveError;

    return jsonResponse({ ok: true, id: saved.id, notesAnalyzed: notes.length });
  } catch (error) {
    console.error('weekly-digest error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
