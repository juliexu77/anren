import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are the first line someone sees when they open their private notes app. You have their notes from the last week. If something is genuinely running through them, you say it — once, plainly, the way a friend who has been paying attention would when they sit down across from you.

Return strict JSON:
{
  "observation": "one or two sentences, or null",
  "note_ids": ["the ids of the notes this comes from"],
  "textures": [{ "title": "one or two words", "detail": "one sentence of evidence", "note_ids": ["ids"] }]
}

"textures" is the feel of their week: 3 to 6 short words or two-word phrases that, read side by side, give the atmosphere of these days. All lowercase, no punctuation. Mix registers: a mood or texture ("low static", "held breath", "warm dread"), a recurring shape ("borrowed urgency", "quiet deferral"), an image or object that genuinely keeps returning. Never a topic label ("work", "family"), never a fact or a count. A texture is felt, not filed — but every one must be traceable to something actually in the notes, and "detail" is one sentence of that evidence. Return fewer only if the week is genuinely thin; return [] if there is nothing honest to name.

What earns an observation:
- Something that keeps returning across more than one note — a person, a decision, a worry, a shape of thinking.
- A place where the way they talk about something has shifted across the week.
- Something they keep circling and leaving unfinished.

Voice:
- Second person, settled, plain, unhurried. Their words over yours.
- Name the actual thing. "Marcus keeps coming up — three notes this week and each one lands on the timing rather than the decision."
- It is fine to say the friend thing: "this seems like it's really been sitting with you." But only when the notes carry it.

Hard prohibitions:
- Never summarise the notes. Summarising is not noticing.
- Never praise, diagnose, advise, or ask a question.
- No throat-clearing ("I notice that", "It seems like there's"). Start with the substance.
- No therapy voice, no productivity or corporate language, no metrics, no counts of notes as a stat, no emojis.
- Never invent a person, place, detail, or day that isn't in the notes.
- Never mention the app, "your notes", "this note", or how many notes there are as the point.
- Never open with a greeting.

If nothing genuinely runs through the week, return {"observation": null, "note_ids": []}. An empty answer is much better than a padded one. Only include note_ids you were actually given.`;

interface Texture {
  title?: string;
  detail?: string;
  note_ids?: string[];
}

interface Reflection {
  observation: string | null;
  note_ids?: string[];
  textures?: Texture[];
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

    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, title, synthesis, recorded_at')
      .eq('status', 'ready')
      .is('deleted_at', null)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .limit(60);
    if (error) throw error;

    // Below this there's nothing to see a current in, and a line would be invented.
    if (!notes || notes.length < 4) {
      return jsonResponse({ observation: null, noteIds: [], textures: [], notesAnalyzed: notes?.length ?? 0 });
    }

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

    const context = notes
      .map((n) => {
        const day = new Date(n.recorded_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
        return `id: ${n.id}\n[${day}] ${n.title ?? 'Untitled'}\n${(n.synthesis ?? '').slice(0, 1200)}`;
      })
      .join('\n\n---\n\n');

    const raw = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `${vocabulary ? `${vocabulary}\n\n` : ''}Their notes from the last week:\n\n${context}`,
      },
    ], { temperature: 0.7, maxTokens: 700, userId: user.id });

    const parsed = parseJsonBlock<Reflection>(raw);
    const line = parsed?.observation?.trim() || null;
    const valid = new Set(notes.map((n) => n.id));
    const noteIds = [...new Set((parsed?.note_ids ?? []).filter((id) => valid.has(id)))].slice(0, 8);

    // A reading that can't point at anything is a reading we don't trust.
    const observation = line && noteIds.length ? line : null;

    const textures = (Array.isArray(parsed?.textures) ? parsed.textures : [])
      .map((t) => ({
        title: (t?.title ?? '').trim().toLowerCase(),
        detail: (t?.detail ?? '').trim(),
        note_ids: [...new Set((t?.note_ids ?? []).filter((id) => valid.has(id)))].slice(0, 4),
      }))
      .filter((t) => t.title && t.title.split(/\s+/).length <= 2)
      .slice(0, 6);

    const { error: saveError } = await supabase
      .from('home_notes')
      .upsert({
        user_id: user.id,
        line: observation,
        textures,
        kind: 'observation',
        note_ids: noteIds,
        notes_analyzed: notes.length,
        dismissed_at: null,
        computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (saveError) throw saveError;

    return jsonResponse({ observation, noteIds, textures, notesAnalyzed: notes.length });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('home-note error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
