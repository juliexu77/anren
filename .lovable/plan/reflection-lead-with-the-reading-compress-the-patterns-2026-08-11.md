# Reflection: lead with the reading, compress the patterns

Right now the panel gives you four grounded mini-essays and then, at the very bottom behind a rule, the one part that actually says something. The hierarchy is backwards — you have to work through the evidence before you get the insight.

## 1. The reading leads

```text
Reflect on these notes  ⌄
┌─ (hairline)
│  ONE WAY TO READ THIS
│  You keep walking into rooms you didn't choose to be in, and the
│  moment you understand what's wrong you become the one expected
│  to fix it. Nobody hands you the rules first.
│  ─────────────────
│  PATTERNS BEHIND IT
│  Competence becoming responsibility
│      See notes ⌄
│  Rules arriving too late
│      See notes ⌄
│  Tools failing under threat
│      See notes ⌄
│  Read again
└─
```

- "One way to read this" moves to the top, 2-4 sentences, editorial serif at the largest size in the panel. It is the product.
- Hairline rule, then `PATTERNS BEHIND IT` as a quiet small-caps label.
- Each pattern is **one line** — a named motif, not a paragraph. No prose retelling the notes by default.
- Under each, a quiet "See notes" text toggle. Collapsed by default; expanding reveals the grounding sentence and the links to the notes it rests on.
- 2-3 patterns maximum.
- If the model returns no reading, the patterns lead on their own — no empty label or rule.

## 2. Ruthless about recurrence

A pattern only earns a place if it shows up across **multiple notes**. A single clever observation from one note — however good — is cut. That's what makes the reflection feel discovered rather than manufactured.

Prompt changes:

- Write the reading first, then name only the motifs that recur across two or more notes and support that reading. Cap at 3.
- Each pattern is a short named phrase (roughly 3-8 words), stated as a claim about a shape or dynamic — not a description of content. "Two of these mention water" is a fact, not a pattern; "competence becoming responsibility" is a pattern.
- `note_ids` must contain **at least two** ids. Anything with one is dropped server-side, so single-note cleverness can't survive even if the model tries.
- Grounding becomes one tight sentence of evidence, since it now lives behind a toggle.
- Keep the existing hard rules: never name the genre or format of the notes, no throat-clearing, no invented details, no advice or therapy voice.
- If nothing recurs, return the reading with zero or one pattern and say so plainly rather than padding.

## Technical notes

- `supabase/functions/folder-reflection/index.ts`: rewrite `PROMPT` per above. Add a server-side filter dropping observations with fewer than two valid `note_ids`, and truncate to the first 3. JSON shape (`{ observations: [{text, grounding, note_ids}], reading }`) and the `folder_reflections` table stay unchanged, so cached rows keep rendering.
- `src/components/FolderReflection.tsx`: reorder — reading block first (`ONE WAY TO READ THIS` label, serif ~`1.15rem`), hairline rule, `PATTERNS BEHIND IT` label, then the one-line patterns. Add local per-pattern expanded state for the "See notes" toggle wrapping the grounding text and note links. "Read again" and the "N new notes since this reading" line keep their positions.
- Redeploy `folder-reflection`. Cached reflections render in the new order immediately but keep their long observation text until "Read again".
