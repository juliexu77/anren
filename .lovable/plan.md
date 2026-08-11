# On my mind: reads itself back

Today this page only fills in when you tap "Look back". It should quietly do it on its own.

## When it regenerates

Checked each time you open the page (and when a note finishes being written up):

- **First one:** you have at least **4** finished notes this week and no look-back yet.
- **Volume:** a look-back exists but **4 or more new notes** have landed since it was written.
- **Freshness:** the look-back is **7+ days old** and there's at least one new note since.

Otherwise nothing happens — no repeat spend, no spinner on every visit. Generation runs once at a time and is skipped entirely if you've already hit the intelligence limit.

## What you see

- Empty state stays as-is until 4 notes exist, then it turns into a quiet "Reading back your week…" line and fills in.
- The prominent "Look back" button becomes a small, low-key "Look again" that only appears once a look-back exists, plus a faint "Read back Tuesday" line so you know how current it is.

## One bug fixed along the way

The page looks for the week starting on **your local** Monday, while the function saves the week starting on the **UTC** Monday. Evenings in Los Angeles those are different dates, so a freshly written look-back can be invisible to the page and you'd be told "Nothing pulled together yet" with no way to fix it. Both sides will use the same UTC Monday.

## Also

The recording bar reads "Talk it through. Anren listens and writes it up." — lowercase to "anren".

## Technical notes

- New hook `src/hooks/useLookBack.ts`: loads the current `weekly_digests` row, counts this week's `status = 'ready'` notes, compares against the stored `notes_analyzed`, and invokes `weekly-digest` when a rule above fires. A module-level in-flight flag plus a per-week `sessionStorage` marker prevent double runs across remounts and the realtime refresh.
- `weekly-digest` already writes `notes_analyzed` and upserts on `(user_id, week_start)`, so regeneration overwrites in place — no schema change needed.
- Quota (`QuotaError` / needs-own-key) responses are swallowed silently in the auto path; the manual "Look again" still surfaces them.
- `src/pages/OnMyMind.tsx` moves its data logic into the hook and switches `startOfWeek` to the UTC Monday used by the function.
