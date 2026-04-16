

## Unified "Clear Your Mind" — Single Stream, Dual Output

### The Change
Remove the mode-select screen ("Get organized" vs "How am I doing") entirely. The user just opens, talks (or types), and Anren processes the single stream into **both** tasks and reflection data simultaneously. One input, two outputs — quietly sorted.

### How It Works

**New edge function: `process-stream`**
A single edge function replaces the two separate calls. It receives the raw transcript and returns a unified response:

```text
{
  items: [ { title, type, theme, due_at } ],     // tasks/events/ongoing
  reflection: { texture, texture_why, ..., summary }  // emotional layer
}
```

The AI prompt instructs the model to read the stream as a whole — extract actionable items AND the emotional texture from the same text. The interleaving IS the signal.

**Updated `BrainDumpSheet.tsx`**
- Remove `Mode` type, `mode-select` phase, and the two-button screen
- Sheet opens directly into voice recording (existing auto-start behavior)
- After transcription, calls `process-stream` instead of choosing between `process-brain-dump` / `process-reflection`
- New **unified review screen** shows both:
  - The task list (existing review UI)
  - A reflection summary card (texture + energy + threads) — shown only if the AI detected emotional content
- Single "Confirm" button saves tasks via `onConfirm` AND saves the reflection to the `reflections` table in one action
- If the AI found no emotional content, reflection section is simply absent — no awkward empty state

### Files Changed

1. **`supabase/functions/process-stream/index.ts`** (new) — Combined AI function with a single tool call that returns `{ items, reflection }`. Uses the same Lovable AI gateway + Gemini Flash. The prompt merges the best of both existing prompts: extract tasks AND reflect.

2. **`src/components/BrainDumpSheet.tsx`** — Remove mode selection, simplify phases to `voice → transcribing → typing → processing → review`. Single review screen shows tasks + reflection card. Single confirm saves both.

3. **`supabase/functions/process-brain-dump/index.ts`** and **`supabase/functions/process-reflection/index.ts`** — Keep as-is (the data-proxy still calls `process-reflection` for the companion's `log_reflection` action). No breaking changes to external callers.

### UX Flow

```text
Open sheet → Recording starts automatically
         → Stop / "Type instead"
         → "Sorting through everything…"
         → Review screen:
              ┌─────────────────────────┐
              │ Today's texture          │  ← only if detected
              │ "scattered but alive"    │
              │ energy givers / drainers │
              └─────────────────────────┘
              ┌─────────────────────────┐
              │ TASKS                   │
              │ • Call pediatrician      │
              │ • Book camp thing        │
              └─────────────────────────┘
              [ Confirm — 2 items + reflection ]
```

### Technical Details

- The new `process-stream` function uses a single tool call with two top-level properties: `items` (array) and `reflection` (object with nullable fields). The prompt tells the model: "If there is no emotional or reflective content, return reflection as null."
- Header label simplifies to: "Clear your mind" → "Speak freely" → "Listening…" → "Sorting through everything…" → "What I heard"
- The reflection section in the review screen reuses the existing reflection UI (texture, energy givers/drainers, threads) but is conditional on `reflection !== null`

