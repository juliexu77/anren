import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading everything someone has kept in their private notes and writing them a letter about where their energy actually is. Speak directly to them, in second person.

Read for charge, not chronology. From the words themselves — pace, specificity, hedging, how much detail a subject earns, whether they are describing something or defending it — work out what lights up and what goes flat. Vivid, concrete, forward-leaning language is energy. Abstract, dutiful, obligation-shaped language ("should", "need to", "just have to get through") is drain. Something can matter to them and still be flat; say so when it is.

Then notice direction. Compare the earlier block against the recent block: is that charge rising, cooling, or converting into something else? What has lost heat, and what picked it up? This is a comparison across the whole run, not a walk through it.

Weight the recent block heaviest. Close by naming where their energy is actually pointing now and what that suggests they lean into or set down — one or two things, plainly, no plan, no encouragement, no steps.

Then one final short paragraph beginning "What this is not asking of you:" — one or two sentences naming what the reading does not demand, so it stays honest rather than tidy.

Write 4 to 6 short paragraphs of plain prose. No headings, no bullet points, no numbering, no emoji. Open with the strongest thing you see — no throat-clearing, never "I notice that" or "It seems like there's".

A pattern only earns a place if it shows up across two or more notes. A single clever observation from one note is cut, however good it is.

Hard prohibitions:
- Do NOT recap notes, and do NOT narrate note by note or day by day. Never write "you started by… then later…". Never name a weekday or a date. Never list topics.
- If a paragraph could be replaced by a summary of one note, it does not belong.
- Never describe what kind of notes these are, what format they're in, or how many there are.
- No therapy voice, no scores, metrics, productivity language, or praise.
- Never invent a person, place, or detail.
- Never mention the app or "your notes" as the subject.

You are also given the names of their projects and loose groupings. Use those names literally when they help; never invent a name that isn't in the list.

Return strict JSON:
{
  "body": "the letter, paragraphs separated by blank lines",
  "note_ids": ["the ids of the notes the patterns you named rest on"]
}`;


interface Letter {
  body?: string;
  note_ids?: string[];
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

    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, title, synthesis, transcript, recorded_at')
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('recorded_at', { ascending: false })
      .limit(60);
    if (error) throw error;

    // Below this nothing has repeated enough to read; a letter here would be invented.
    if (!notes || notes.length < 8) {
      return jsonResponse({ body: null, noteIds: [], notesAnalyzed: notes?.length ?? 0, thin: true });
    }

    const ordered = [...notes].reverse();

    const [{ data: projects }, { data: threads }] = await Promise.all([
      supabase.from('projects').select('name').is('deleted_at', null).limit(40),
      supabase.from('threads').select('name').eq('status', 'active').limit(40),
    ]);

    const vocabulary = [
      (projects ?? []).length ? `Their projects: ${(projects ?? []).map((p) => p.name).join(', ')}` : '',
      (threads ?? []).length ? `Loose groupings: ${(threads ?? []).map((t) => t.name).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const context = ordered
      .map((n) => {
        const day = new Date(n.recorded_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
        return `id: ${n.id}\n[${day}] ${n.title ?? 'Untitled'}\n${(n.synthesis ?? '').slice(0, 1000)}\n${(n.transcript ?? '').slice(0, 1500)}`;
      })
      .join('\n\n---\n\n');

    const raw = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `${vocabulary ? `${vocabulary}\n\n` : ''}Their notes, oldest first:\n\n${context}`,
      },
    ], { temperature: 0.75, maxTokens: 2000, userId: user.id });

    const parsed = parseJsonBlock<Letter>(raw);
    const body = parsed?.body?.trim();
    if (!body) throw new Error('Could not write the letter');

    const valid = new Set(ordered.map((n) => n.id));
    const noteIds = [...new Set((parsed?.note_ids ?? []).filter((id) => valid.has(id)))].slice(0, 12);
    const computedAt = new Date().toISOString();

    const { error: saveError } = await supabase
      .from('patterns')
      .upsert({
        user_id: user.id,
        body,
        note_ids: noteIds,
        notes_analyzed: ordered.length,
        computed_at: computedAt,
        updated_at: computedAt,
      }, { onConflict: 'user_id' });
    if (saveError) throw saveError;

    return jsonResponse({ body, noteIds, notesAnalyzed: ordered.length, computedAt });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('notice-patterns error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
