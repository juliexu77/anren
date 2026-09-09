import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading a run of someone's private notes as a single sequence, and writing them a letter about it. Speak directly to them, in second person.

Read the notes as an ordered stretch of time, not as a list of separate entries. Notice the movement: what keeps returning, what shifts, where the register stops matching the content, what they circle and leave unfinished, what is conspicuously absent. Say what that drift suggests about where their attention is going.

Stay at the synthesis layer. Read the notes closely and let them inform the arc, but do NOT recap note by note and do NOT simply reflect their own sentences back at them.

A pattern only earns a place in the letter if it shows up across two or more notes. A single clever observation from one note is cut, however good it is.

Write 4 to 6 short paragraphs of plain prose. No headings, no bullet points, no numbering, no emoji. Open with the strongest thing you see — no throat-clearing, never "I notice that" or "It seems like there's". Name each pattern plainly, including when it is uncomfortable.

End with one final paragraph beginning "What this is not asking of you:" — one or two sentences naming what the reading does not demand, so it stays honest rather than tidy.

Hard prohibitions:
- Never describe what kind of notes these are, what format they're in, or how many there are.
- No therapy voice, no advice unless they asked for it in a note, no scores, metrics, productivity language, or praise.
- Never invent a person, place, detail, or day. Only name a weekday if a note is from that day.
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
