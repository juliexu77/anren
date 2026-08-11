# Open in place, sharpen the voice, move the thinking to Claude

Three changes, all in service of the same thing: reflection should feel like a friend reading your notes back to you, not a page you got sent to and not a summary of what you already know.

## 1. No navigation — it opens in place

Keep the affordance under the note count, but expand instead of route.

- Label becomes a statement, not a question: **Reflect on these notes**, with a small chevron so it reads as something that opens.
- Tapping expands a panel directly below it, above the day-grouped notes. The archive stays visible; you never leave the folder.
- While it thinks: "Reading these back…" inside the panel.
- Once open the label flips to "Hide reflection". Collapsing keeps the result cached, so reopening is instant.
- Generation runs on first expand only — opening a folder never triggers a model call.
- "Read again" becomes a quiet text link at the bottom of the panel.

```text
Dreams
4 notes
Reflect on these notes  ⌄
┌─ (hairline)
│  You keep ending up in rooms you don't recognise…
│     Unfamiliar house · Long hallway
│  … 3-5 observations …
│  ─────────────────
│  ONE WAY TO READ THIS
│  Read again
└─
TODAY
  note
```

The `/folder/:projectId/reflection` route and page go away.

## 2. A wiser voice

The current output states the obvious ("many of these recount dreams") because it was told to stay factual. New instruction set:

- **Never describe the genre or format of the notes.** You already know they're dreams. Say nothing about what kind of notes they are, how many there are, or what they're "about" at the surface level.
- Skip anything the person would already say themselves if asked. The bar for every observation: *would this make them pause?*
- Notice the second-order things — what sits next to what, what's conspicuously absent, where the emotional register doesn't match the content, what repeats in form rather than subject, the difference between how something is described early versus late.
- Fewer, better: 3-4 observations, each one earning its place. If only two are genuinely interesting, give two.
- Written as a friend who's been paying attention: direct, unhurried, willing to say something a little pointed. Second person. No hedging clichés stacked on each other, no therapy voice, no "it's interesting that…" preamble — start with the substance.
- Grounding stays required, but now it's evidence for a real claim rather than a citation for a summary.
- The closing "One way to read this" gets more license to be genuinely speculative — that's what it's visually marked for.

## 3. Claude across the app

The app's `ANTHROPIC_API_KEY` is already in place. Switch all text generation from Gemini to Claude Sonnet by changing the one shared `chat()` helper — every function that thinks (reflections, note synthesis, look-back digest, search answers, folder emoji, ask-a-note) inherits it in one move.

Embeddings stay on the current provider — Claude doesn't offer them, and search relevance is unaffected.

## Technical notes

- `supabase/functions/_shared/ai.ts`: rewrite `chat()` against `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY` — system prompt hoisted to the top-level `system` field, `max_tokens` set, text pulled from `content[0].text`. Same signature, so no call site changes. `CHAT_MODEL` becomes `claude-sonnet-4-5`. Keep `embed()` on the Lovable gateway.
- Redeploy every function that calls `chat()`: `folder-reflection`, `process-note`, `weekly-digest`, `search-notes`, `ask-note`, `suggest-folder-emoji`.
- New `src/components/FolderReflection.tsx` (collapsible section owning fetch, invoke, and open state), rendered from `src/pages/Index.tsx` when a folder has 2+ notes. Delete `src/pages/FolderReflection.tsx` and its route.
- Prompt rewrite in `supabase/functions/folder-reflection/index.ts`; JSON shape and the `folder_reflections` table stay as-is.
