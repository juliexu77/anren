# Themes as pills, one blurb up top

Both reflection surfaces keep their opening reading and drop the mini-paragraphs. Patterns become quiet rounded pills you can tap.

## 1. Folder reflection

```text
Reflect on these notes  ⌄
┌─ (hairline)
│  ONE WAY TO READ THIS
│  You keep walking into rooms you didn't choose to be in, and the
│  moment you understand what's wrong you become the one expected
│  to fix it.
│
│  ( competence becoming responsibility ) ( rules arriving too late )
│  ( tools failing under threat )
│
│  Read again
└─
```

- Keep the reading exactly as it is — largest text in the panel, editorial serif.
- Replace the "Patterns behind it" list and its per-item paragraphs with a row of rounded pills: hairline border, ivory/muted surface, small text, wrapping.
- Drop the `PATTERNS BEHIND IT` label and the divider — the pills read as an obvious second layer without them.
- Tapping a pill expands a small block beneath the pill row with that pattern's one-sentence grounding plus the links to the notes it rests on. Tapping again (or another pill) swaps it out. No accordion per pill.
- Nothing to change server-side: the existing `observations[{text, grounding, note_ids}]` shape is already exactly what pills need.

## 2. On my mind (week)

- Lead with a short reading blurb, same length as the folder one (2-4 sentences, one paragraph), in editorial serif — not the current multi-paragraph "longer read" at that size.
- Below it, the same pill row for "what kept coming up". Pills carry the theme title; tapping shows the theme's `detail` sentence beneath.
- Remove the separate "The longer read" section and the "What kept coming up" heading — the page becomes blurb + pills, matching the folder panel.

Prompt change for the weekly digest: `narrative` becomes a single 2-4 sentence reading (same instruction as the folder prompt) instead of 2-3 paragraphs, and `detail` becomes one tight sentence of evidence since it now sits behind a pill.

## Technical notes

- `src/components/FolderReflection.tsx`: swap the observation list for a pill row (`flex flex-wrap gap-2`, `rounded-full border border-hairline px-3 py-1.5 text-[0.8rem]`, active pill gets a slightly stronger surface). Single `activeIndex` state instead of the `expanded` record. Grounding + note `Link`s render once, below the row.
- `src/pages/OnMyMind.tsx`: reorder to narrative blurb first (serif ~`1.15rem`, no `whitespace-pre-line`), then the pill row built from `digest.themes` with a shared local `activeIndex`. Extract the pill row into `src/components/ThemePills.tsx` so both surfaces use one component.
- `supabase/functions/weekly-digest/index.ts`: update `PROMPT` for the shorter `narrative` and one-sentence `detail`; redeploy. Existing cached digests still render — they'll just have a longer blurb until "Look again".
- No schema or table changes.
