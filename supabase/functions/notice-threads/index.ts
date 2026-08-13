import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chat, parseJsonBlock, jsonResponse, QuotaError, needsOwnKeyResponse } from '../_shared/ai.ts';

const PROMPT = `You are reading back over someone's private notes to notice what is emerging across them — the conversations they keep having with themselves without meaning to.

A thread is a body of thinking that shows up across several separate notes. It is not a category and not a folder. It is the thing they keep circling.

Return strict JSON, and nothing else:
{
  "threads": [
    {
      "existing_thread_id": "<uuid of a thread you were given>" or null,
      "name": "1-4 words, plain, in their own register",
      "blurb": "one short sentence naming what this thread actually is",
      "note_ids": ["uuid", "uuid"],
      "quotes": ["a short verbatim fragment from one of the notes"],
      "merges_into": "<uuid of another thread you were given>" or null
    }
  ]
}

Rules:
- Return AT MOST 6 threads, and only ones that are genuinely alive right now. Returning fewer, or none, is correct when nothing rhymes.
- Every thread needs at least 3 notes that truly belong together. Not "both are about work" — the same worry, the same question, the same body of thinking.
- If a thread you were given is still alive, return it with its existing_thread_id, its full current note set, and a name you'd use now. You may rename it as it clarifies.
- If two threads you were given are really one thing, return the survivor and set merges_into on the other to the survivor's id.
- quotes must be copied verbatim from the notes you were given. 1-3 per thread, short. Never paraphrase, never invent.
- Names are things a person would say out loud: "Protecting my energy", "Leaving tech", "What work should feel like". Never "Miscellaneous", "Personal", "Reflections", "Themes".
- Never use the words folder, organize, file, category, tag, or any productivity language.
- Second person, warm, plain. Describe what they keep returning to. Do not diagnose, speculate about them, or offer advice.
- note_ids and ids must be ones you were given. Never invent one.`;

interface Cluster {
  existing_thread_id?: string | null;
  name?: string;
  blurb?: string;
  note_ids?: string[];
  quotes?: string[];
  merges_into?: string | null;
}

const DAY = 24 * 60 * 60 * 1000;
const DORMANT_AFTER = 21 * DAY;
const DISMISS_QUIET = 21 * DAY;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

/** Cheap "is this the same shape" check — shared words in the name or a heavy note overlap. */
function resembles(name: string, noteIds: string[], other: { name: string; note_ids: string[] }) {
  const a = new Set(normalize(name).split(/\s+/).filter((w) => w.length > 3));
  const b = new Set(normalize(other.name).split(/\s+/).filter((w) => w.length > 3));
  const sharedWords = [...a].filter((w) => b.has(w)).length;
  if (sharedWords >= 2 || (a.size === 1 && sharedWords === 1)) return true;

  const theirs = new Set(other.note_ids ?? []);
  if (!theirs.size || !noteIds.length) return false;
  const overlap = noteIds.filter((id) => theirs.has(id)).length;
  return overlap / Math.min(noteIds.length, theirs.size) >= 0.6;
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

    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, synthesis, transcript, body, recorded_at')
      .eq('status', 'ready')
      .is('deleted_at', null)
      .order('recorded_at', { ascending: false })
      .limit(60);

    if ((notes ?? []).length < 6) {
      return jsonResponse({ ok: true, threads: [], reason: 'too_few' });
    }

    const { data: existingRows } = await supabase
      .from('threads')
      .select('id, name, note_ids, status, last_seen_at, dismissed_at')
      .in('status', ['active', 'dismissed']);

    const active = (existingRows ?? []).filter((t) => t.status === 'active');
    const dismissed = (existingRows ?? []).filter(
      (t) => t.status === 'dismissed' &&
        Date.now() - new Date(t.dismissed_at ?? t.last_seen_at).getTime() < DISMISS_QUIET,
    );

    const noteIndex = new Map((notes ?? []).map((n) => [n.id, n]));

    const context = (notes ?? [])
      .map((n) => {
        const words = (n.transcript ?? n.body ?? '').slice(0, 900);
        return `id: ${n.id}\ndate: ${new Date(n.recorded_at).toDateString()}\ntitle: ${n.title ?? 'Untitled'}\nwrite-up: ${n.synthesis ?? ''}\ntheir words: ${words}`;
      })
      .join('\n\n---\n\n');

    const activeList = active.length
      ? active.map((t) => `${t.id} — ${t.name} (${(t.note_ids ?? []).length} notes)`).join('\n')
      : '(none yet)';

    const raw = await chat([
      { role: 'system', content: PROMPT },
      {
        role: 'user',
        content: `Threads already noticed:\n${activeList}\n\nRecent notes:\n\n${context}`,
      },
    ], { temperature: 0.5, userId: user.id });

    const parsed = parseJsonBlock<{ threads?: Cluster[] }>(raw);
    const clusters = Array.isArray(parsed?.threads) ? parsed!.threads! : [];

    const activeIds = new Set(active.map((t) => t.id));
    const now = new Date().toISOString();
    const keptIds = new Set<string>();
    const merges: { from: string; into: string }[] = [];

    for (const cluster of clusters) {
      const name = (cluster.name ?? '').trim();
      const noteIds = [...new Set((cluster.note_ids ?? []).filter((id) => noteIndex.has(id)))];
      if (!name || noteIds.length < 3) continue;

      // A shape recently waved away shouldn't come straight back.
      if (dismissed.some((d) => resembles(name, noteIds, { name: d.name, note_ids: d.note_ids ?? [] }))) {
        continue;
      }

      const quotes = (cluster.quotes ?? [])
        .map((q) => (typeof q === 'string' ? q.trim() : ''))
        .filter(Boolean)
        .slice(0, 3);

      const mergeTarget = cluster.merges_into && activeIds.has(cluster.merges_into)
        ? cluster.merges_into
        : null;

      const existingId = cluster.existing_thread_id && activeIds.has(cluster.existing_thread_id)
        ? cluster.existing_thread_id
        : null;

      if (existingId) {
        if (mergeTarget && mergeTarget !== existingId) {
          merges.push({ from: existingId, into: mergeTarget });
          continue;
        }
        const previous = active.find((t) => t.id === existingId);
        const grew = noteIds.length > (previous?.note_ids ?? []).length;
        await supabase
          .from('threads')
          .update({
            name,
            blurb: (cluster.blurb ?? '').trim() || null,
            note_ids: noteIds,
            quotes,
            status: 'active',
            last_seen_at: grew ? now : (previous?.last_seen_at ?? now),
            updated_at: now,
          })
          .eq('id', existingId);
        keptIds.add(existingId);
        continue;
      }

      const { data: created } = await supabase
        .from('threads')
        .insert({
          user_id: user.id,
          name,
          blurb: (cluster.blurb ?? '').trim() || null,
          note_ids: noteIds,
          quotes,
          status: 'active',
          first_seen_at: now,
          last_seen_at: now,
        })
        .select('id')
        .single();
      if (created) keptIds.add(created.id);
    }

    // Merge by id: the survivor takes the union of notes, the absorbed one retires.
    for (const { from, into } of merges) {
      const survivor = active.find((t) => t.id === into);
      const absorbed = active.find((t) => t.id === from);
      const union = [...new Set([...(survivor?.note_ids ?? []), ...(absorbed?.note_ids ?? [])])];
      await supabase
        .from('threads')
        .update({ note_ids: union, last_seen_at: now, updated_at: now })
        .eq('id', into);
      await supabase
        .from('threads')
        .update({ status: 'merged', merged_into: into, updated_at: now })
        .eq('id', from);
      keptIds.add(into);
      keptIds.delete(from);
    }

    // Threads anren didn't see this time, and that haven't moved in weeks, go quiet.
    const stale = active.filter(
      (t) => !keptIds.has(t.id) && Date.now() - new Date(t.last_seen_at).getTime() > DORMANT_AFTER,
    );
    if (stale.length) {
      await supabase
        .from('threads')
        .update({ status: 'dormant', updated_at: now })
        .in('id', stale.map((t) => t.id));
    }

    return jsonResponse({ ok: true, noticed: keptIds.size });
  } catch (error) {
    if (error instanceof QuotaError) return needsOwnKeyResponse();
    console.error('notice-threads error:', (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
