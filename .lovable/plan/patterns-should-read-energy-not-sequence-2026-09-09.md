# Patterns should read energy, not sequence

Right now the letter walks your notes in order and describes them. That makes it a recap. The fix is to change what it's asked to look for and the order it's allowed to say things in: read everything at once for charge, notice which way that charge is moving, then let the most recent notes say what that suggests about where to spend yourself next.

## What changes in the reading

The letter stops narrating time and starts reading energy.

1. **Charge first.** Across everything, what lights up and what goes flat — judged from the words themselves: pace, specificity, hedging, how much detail a subject earns, whether you're describing it or defending it. Vivid, concrete, forward-leaning language is energy; abstract, dutiful, obligation-shaped language ("should", "need to", "just have to get through") is drain. Something can be important and still flat, and the letter is allowed to say so.
2. **Direction.** Is that charge rising, cooling, or converting into something else? Where has a subject lost heat since the earlier notes, and what picked it up? Comparison across the whole run, not a walk through it.
3. **What the recent stretch indicates.** The last handful of notes get weighted heaviest. The letter closes by naming where your energy is actually pointing now and what that suggests you lean into or set down — plainly, one or two things, no plan and no encouragement.
4. **Explicitly forbidden:** recapping notes, day-by-day or note-by-note movement, "you started by… then later…", weekday narration, listing topics. If a paragraph could be replaced by a summary of one note, it doesn't belong.

The ending line changes: instead of only "what this is not asking of you", the letter ends with a short read on where to put yourself next, followed by the honest line about what it isn't demanding. So: energy → direction → what that points at → what it doesn't ask.

Voice rules stay: second person, plain prose, 4-6 short paragraphs, no headings or bullets, no therapy voice, no productivity language, no scores, nothing invented, opens with the strongest observation.

## Structure the model gets

Same notes, presented differently so sequence isn't the only available frame:
- Notes are grouped into **earlier** and **recent** (recent = the most recent third, minimum 5), each block labeled, rather than one flat oldest-first list. That gives the model something to compare instead of something to narrate.
- Days are dropped from each note line (they invite weekday narration); only the block labels carry time.
- Note ids, titles, synthesis and transcript excerpts stay, so patterns can still cite the notes they rest on.

## The page

Unchanged in layout. The letter reads differently; "Read again" still forces a fresh one, the drawn-from links and the words-you-keep-using strip stay as they are. Existing stored letters are stale by definition, so the header gets a nudge: opening the page after this ships rewrites once.

## Technical notes

- `supabase/functions/notice-patterns/index.ts` — rewrite `PROMPT` per the reading rules above; build the context in two labeled blocks (earlier / recent) and drop the per-note date; keep the JSON contract `{ body, note_ids }`, the id validation, the usage gate, and the upsert unchanged. Raise `maxTokens` slack is not needed; keep 2000.
- One-off SQL to force a single rewrite for existing rows: set `computed_at` back beyond the 24h staleness window (`update public.patterns set computed_at = now() - interval '2 days'`). No schema change.
- `usePatterns.ts` and `Patterns.tsx` unchanged.
