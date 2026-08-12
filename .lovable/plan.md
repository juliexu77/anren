# Composer layout + a hands-off onboarding

Two changes: the bottom capture bar puts recording first, and onboarding shows the magic instead of asking the user to perform it.

## 1. Capture bar: record on the left, typing on the right

In `src/components/CaptureBar.tsx`:

- Reorder the inner flex row so the round action button (mic / stop / send / spinner) renders first, then the text field or the recording status read-out.
- Change the field's placeholder to **"Type or copy/paste from elsewhere…"** and match the accessible label to it.
- Everything else stays: mic starts, square stops, arrow sends a typed note, spinner while saving, same styling, animation, spacing and safe-area handling. No state, API, or routing changes.

## 2. Onboarding: an animated example, nothing to perform

The earlier version made the user record their first note. This one asks nothing of them — anren demonstrates itself and they can watch, skip, or start whenever they like. A short sequence they tap through, full-screen on paper ivory, with a quiet "skip" always available.

**Card 1 — anren.** "Where the mental load rests." One line under it: you talk, anren keeps the thought.

**Card 2 — the demo, animated.** The whole loop plays itself out in miniature, no input needed:

1. A small composer mock appears with the mic lit and a soft pulse ring — the same shape they'll see in the app.
2. Example spoken words type themselves in, line by line, the way a live transcript arrives — a real-sounding, everyday thought, not a to-do list.
3. The transcript settles, a brief line says anren is writing it up.
4. The finished note fades in over it: title, a short synthesis, the words underneath. This is the payoff beat, held long enough to read.

The animation loops once and rests on the finished note. A "play it again" affordance replays it, and "next" moves on. Respects reduced-motion by rendering the finished note immediately with no typing effect.

**Card 3 — filing, animated.** A folder gets made in miniature, then the pattern-finding lands:

1. Two or three example note rows sit in a small feed mock.
2A folder name types itself into a new-folder row, a glyph sparkles into place, and the notes slide into it one by one.
3. The folder's reflection then writes itself in: a short reading in serif, followed by theme pills appearing one at a time. The point being made: once a few thoughts sit together, anren tells you what they have in common.

**Card 4 — the weekly reading.** A Reflect card animates in the same way — the week's narrative, then its pills — with one line explaining anren does this on its own, once a week, without being asked.

**Card 5 — over to you.** "Say something when you're ready." Dismisses onboarding and drops them on the feed with the composer in focus — no forced recording.

## 3. No seeded notes — a blank canvas, on purpose

Your instinct is the right one, and the research backs it. Apps whose content is *work* — Notion, Craft — seed starter templates. Apps whose content is *first-person and intimate* — Day One, Bear, Apple Notes, Reflect, Obsidian — never fabricate diary entries; they teach with prompts and walkthroughs instead. Day One specifically holds its AI features back until you've actually written something.

Two reasons it matters here: a fake voice memo with a fake write-up reads as uncanny in a space sold as private, and it's clutter the user has to delete out of their own archive. Since the animated cards already teach the mechanic, seeding would be redundant on top of risky.

So instead:

- **A warm, actionable empty feed.** One line naming the next action rather than describing the app: press record and say what's on your mind — anren will write it up.
- **Defer the derived surfaces.** Reflect and folder reflections don't show empty or fake cards; until there's real material they show a quiet not-yet line ("once a few thoughts have gathered, anren will read them back"). No fake reading, no placeholder pills.

Sources: Day One AI features (dayoneapp.com/guides/ai-features/go-deeper/), Smashing Magazine on onboarding empty states (smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps/), Carbon Design System empty-state pattern (v10.carbondesignsystem.com/patterns/empty-states-pattern/), "Designing for Honesty" (intrepidkarthi.com/writing/designing-for-honesty/).

## 4. The Reflect nudge

Once the user has their own notes and a weekly reading exists, a single dismissible line at the top of the feed: "anren has read your week back — see Reflect." No coach marks anywhere.

## Also

- "Show me around again" in Settings replays the sequence.

## Technical notes

- Gate on the existing `profiles.onboarding_completed` (already defaults to `false`) — no schema change. A small `useOnboarding` hook reads and flips it; the app shell renders the onboarding overlay above the routes while it's `false`, so no new routes.
- The demo cards are pure presentation: staged local state driving the typing, filing and reveal beats, with fixed example copy. They never touch the recorder, the microphone, the database, or any edge function, so they cost nothing and can't fail.
- Nothing is written to the user's account during onboarding beyond flipping the flag.
- Copy stays lowercase "anren", contemplative voice, no productivity language.
