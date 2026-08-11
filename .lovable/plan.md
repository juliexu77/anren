# Reflection: lead with the reading, sharpen the details

Right now the panel gives you four grounded observations and then, at the very bottom behind a rule, the one part that actually says something. That's backwards. And the observations read like careful summaries because the prompt still asks them to be evidence-first.

## 1. Flip the order

The reading becomes the lead — the first thing you see when the panel opens.

```text
Reflect on these notes  ⌄
┌─ (hairline)
│  You keep walking into rooms you didn't choose to be in, and
│  never once try the door you came through.
│  ─────────────────
│  IN THE DETAIL
│  Two of these end mid-scene…
│     Unfamiliar house · Long hallway
│  … 2-4 more …
│  Read again
└─
```

- The reading sits at the top, unlabelled, in the editorial serif at the largest size in the panel — it reads as the thing being said, not a footnote.
- A hairline rule below it, then the observations under a quiet small-caps label (`IN THE DETAIL`) so they clearly serve the reading rather than compete with it.
- The observations lose their serif prominence: they become the smaller supporting layer, grounding text and note links unchanged.
- If the model returns no reading, the observations simply lead as they do now — no empty label, no rule.

## 2. Make the observations insightful, not factual

The prompt currently frames each observation as "evidence from the specific notes", which is why they land as descriptions. Reframe them as the reading's load-bearing parts:

- Generate the reading first, then the observations as the specific places in the notes where that reading shows itself. Each observation says something the person wouldn't have said themselves; the `grounding` field carries the factual citation so the observation text is free to be a claim.
- Add explicit failure examples to the prohibitions ("two of these mention water" is a fact, not an observation) so the model can tell the difference.
- Keep the existing hard rules: never name the genre or format, no throat-clearing, no invented detail, note_ids only where the claim actually rests.
- Keep 2-4 observations. If the reading is thin, fewer is correct.

## Technical notes

- `src/components/FolderReflection.tsx`: reorder the render — reading block first (serif, `text-[1.15rem]`, no uppercase header), hairline rule, `IN THE DETAIL` label, then the observation list at reduced weight/size. "Read again" and the "N new notes since this reading" line stay where they are.
- `supabase/functions/folder-reflection/index.ts`: rewrite `PROMPT` per above — reading-first instruction order, sharpened observation definition, added anti-examples. JSON shape (`{ observations: [{text, grounding, note_ids}], reading }`), the `folder_reflections` table, and validation logic stay unchanged, so cached reflections keep rendering.
- Redeploy `folder-reflection`. Existing cached rows will render in the new order immediately; their observation text stays as generated until "Read again".
