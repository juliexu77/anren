# Folder marks: hand-drawn ink glyphs

Swap the stock emoji next to each folder for a small set of hand-drawn ink marks in clay-rose — quieter than emoji, more like something sketched in a margin. Anren picks one from the folder name; you can change it any time from the same picker you have now.

## What you'll see

**The marks.** Roughly 28 single-stroke line drawings, drawn in the accent ink at hairline weight: a kite, a moth, a pot of tea, a paper plane, a knot, a doorway, a stone, a sprout, a bell, a spool, a moon, a ladder, a wave, an eye, a key, a match, a shell, a feather, a bowl, a lamp, a stack of books, an envelope, a clock face, a compass, a fish, a small house, a thread and needle, a plain circle for "no mark yet". Each is deliberately a little odd rather than literal — a folder called "burnout" gets the match, "Mom" gets the teapot, "coworking space" gets the doorway.

**Choosing.** Same picker as today: tap the mark in the sidebar or on the folder page. Top row shows what Anren suggests for that name, below it the full grid of marks. The paste-any-emoji field stays, so an emoji still works if you want one.

**In place.** The mark keeps the existing settle-in animation on newly created folders. On hover it doesn't wobble or bounce — the line just deepens slightly in ink.

**Your existing folders.** Anything that already has an emoji keeps showing that emoji, untouched. New folders get glyphs.

## Voice and restraint

No color beyond the accent ink, no fills, no gradients, no motion beyond the existing settle. The delight comes from the choice being slightly unexpected, not from the mark being loud.

## Technical notes

**Glyph set** — new `src/components/folder-glyphs.tsx` exporting a keyed record of small inline SVGs (`viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth={1.4}`, round caps, no fill) plus a `FolderGlyph` component that renders by key at a `size` prop. Color comes from `text-accent`-family semantic tokens; nothing hardcoded.

**Storage** — reuse the existing `projects.emoji` column, no migration. Glyph values are stored as `glyph:kite`; anything without the prefix is treated as a literal emoji and rendered as text. Single render helper decides which path to take so both the sidebar and the folder header stay consistent.

**Suggestion** — `supabase/functions/suggest-folder-emoji/index.ts` is updated to return glyph keys instead of emoji: the prompt receives the allowed key list with a one-line sense of each, and must reply with `{"glyph":"<key>","alternates":["<key>","<key>","<key>"]}`. Server-side validation rejects anything not in the allow-list; the keyword fallback map is rewritten to map to glyph keys, with `circle` as the neutral default. Response shape becomes `{ emoji: "glyph:<key>", alternates: ["glyph:<key>", ...] }` so `useProjects` and the picker need no contract change.

**Picker** — `src/components/FolderEmojiPicker.tsx` renders suggestions and the grid with `FolderGlyph` instead of emoji text; `COMMON` becomes the glyph key list. The free-text field keeps writing a bare emoji character.

**Sidebar and folder page** — `ProjectRail.tsx` and `pages/Index.tsx` are unchanged apart from passing through the taller trigger sizing; the existing `stipple-in` animation classes stay where they are.
