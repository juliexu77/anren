# Granola for talking to yourself. With memory.

Three changes, plus one small copy fix. No On My Mind restructure, no thread route.

## 1. Three voices, kept distinct

- **Raw transcript — "I".** Untouched, always available.
- **Note synthesis — "you", settled.** Short, factual, close to what you said. Describes, doesn't interpret.
- **Reflection — "you", tentative.** The looking-back voice, and the only place hedged language belongs: "you seem to have circled this a few times lately". Never a verdict, never advice.

This is prompt-level work: the note write-up stays plainly descriptive, and hedging is confined to the reflection prompt so the two voices never blur.

## 2. Search: retrieval first, interpretation second

- Results render immediately as the primary surface — your notes, your snippets, your dates.
- The AI answer no longer sits above them. It moves below the results, behind a quiet line you tap ("See what these have in common"), and is only generated when you ask for it.
- So nothing narrates your archive back at you before you've read your own words.

## 3. Related, under a note

At the bottom of a note, above the transcript:

> **Related** — 2 to 4 earlier notes, title and date only.

- Pure embedding similarity on the passage vectors you already have. No AI explanation of why they connect.
- Tapping one opens that note. Nothing else.
- Silent when nothing is close enough — no empty state.

No thread view. If following the whole line of thought turns out to be something you reach for repeatedly, that's when it earns building.

## 4. Small fixes

- Browser tab: `anren — think out loud`.
- On My Mind: remove the "N notes read" line. Everything else about that screen stays as it is for now.

---

## Technical notes

- **`related-notes` edge function**: mean-pool the source note's passage embeddings, cosine-search `note_passages` excluding that note, group by `note_id`, keep the top 4 above a similarity floor, return id/title/recorded_at. RLS-scoped user client, same shape as the other functions.
- **`search-notes`**: retrieval returns immediately with `results` only; the synthesis moves behind an `explain: true` flag so the UI fetches it on demand. `SearchPage` renders hits first and the answer below, collapsed.
- **`process-note`**: prompt tightened to keep the settled synthesis unhedged and non-interpretive.
- **`weekly-digest`**: reflection prompt gains explicit tentative-voice rules (hedged verbs, no conclusions). Output shape unchanged, no migration.
- **`index.html`**: title, description, `og:`/`twitter:` fields.
- **`NoteDetail.tsx`**: Related section between synthesis/audio and transcript; "Ask about this note" stays where it is.
