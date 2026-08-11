# Retrieval first, a mirror instead of a report, and notes that find each other

Four changes, in the spirit of your notes: your own words come first, the archive reflects rather than reports, and recurrence becomes visible.

## 1. Three voices, kept distinct

No first-person rewrite. Instead, make the existing voices deliberate and consistent:

- **Raw transcript — "I".** Untouched, always available.
- **Note synthesis — "you", settled.** Short, factual, close to what you said. Unchanged in voice, tightened so it stops editorialising.
- **Reflection — "you", tentative.** The longer looking-back voice, and the only place hedged language belongs: "you seem to have circled this question a few times lately", "this may be unresolved". Never certain, never conclusive.

The reflection voice gets its own prompt rules (hedged verbs, no verdicts, no advice) and is used in On My Mind and in the secondary search answer, so the two never blur into each other.

## 2. Search: your thoughts first, interpretation second

- Results render immediately as the primary surface — your notes, your snippets, your dates, ranked by match.
- The AI answer no longer sits above them. It appears below the results, collapsed behind a quiet line ("See what these have in common"), and is only generated when you open it. Nothing gets narrated at you before you've read your own words.
- Snippets highlight the matched phrasing so scanning feels like reading yourself, not a summary.

## 3. On My Mind: a mirror, not a digest

- Drops "weekly digest" framing entirely. No week-of subtitle as the headline, no "N notes read" metric — that line is removed.
- Restructured around four quiet questions, each in the tentative voice, each backed by links to the actual notes:
  - What keeps surfacing
  - What you're circling
  - What shifted
  - What's still open
- Sections only appear when there's real material; thin weeks stay short and say so.
- The refresh action reads "Look back" rather than "Pull it together".

## 4. Related notes over time

The centrepiece addition. On every note, below the synthesis:

> **Connects to 4 earlier notes** — titles and dates, nothing else.

- Pure embedding similarity against your existing passage vectors. No AI conclusion, no explanation of the connection.
- Tapping one goes to that note. Tapping the header opens a **thread view**: those notes plus the current one in chronological order, each with its synthesis, so you can watch the idea recur and change shape.
- Silent when nothing is close enough — no empty state, no filler.

Per-note "Ask about this note" stays but moves below related notes, so connection is what you meet first.

## 5. Browser tab

Title becomes `anren — think out loud`, with the description and share cards updated to match.

---

## Technical notes

- **`related-notes` edge function**: mean-pool the note's passage embeddings, query `note_passages` by cosine distance excluding the source note, group by `note_id`, keep the top 4-6 above a similarity floor. Returns ids, titles, dates, best-matching passage. Same RLS-scoped user client as the other functions.
- **Thread view**: new route `/note/:noteId/thread` reusing the related-notes result; read-only, chronological.
- **Search**: `search-notes` splits into two paths — retrieval returns immediately (`results` only), and the synthesis becomes a separate `explain=true` call so the UI can render hits first and fetch the answer on demand.
- **`weekly-digest`**: prompt returns `{ surfacing, circling, shifted, open }`, each with `note_ids` for linking, in the tentative reflection voice. Stored in the existing `weekly_digests.themes` JSON — no migration needed. `notes_analyzed` stays in the table but is no longer read by the UI.
- **`process-note`**: prompt rules tightened so the settled synthesis voice stays descriptive and unhedged; hedging lives only in the reflection prompt.
- **`index.html`**: title, description, `og:`/`twitter:` title and description.
