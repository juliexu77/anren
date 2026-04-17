
## What's happening

Three things are causing AI-assigned due dates to slip through:

1. **`process-brain-dump`** and **`process-stream`** ask the AI to extract `due_at` "only if explicitly mentioned" — but the AI still over-interprets phrases like "soon", "this week", "Friday", or even derives a date from context. The schema also exposes `due_at` as a field, which biases the model toward filling it.
2. **`generate-life-review`** literally renders a section called "Pressing or overdue threads right now" and feeds the AI a "due [date]" line per pressing card — which is where the word "overdue" surfaces in the weekly briefing.
3. **`generate-daily-plan` (Run My Day)** injects `(due: Mar 5)` strings into the prompt and tells the AI to "prioritize approaching deadlines" and "gently note if a deadline is close" — so even good cards without dates get nudged, and bad AI-assigned dates get amplified.

Voice (`transcribe-voice`) and image (`parse-image`) paths already do **not** set due dates — confirmed.

## The fix (server-only, no DB migration)

**Principle:** due dates are a user-only field. The AI never writes one. Anything the user didn't type or pick on a date control stays `null`.

### 1. Strip `due_at` extraction from all AI intake paths

- **`process-brain-dump/index.ts`** — remove the `due_at` property from the `extract_items` tool schema entirely, and remove the rule about it from the system prompt. Items come back with title + type + theme only.
- **`process-stream/index.ts`** — same: remove `due_at` from the tool schema and prompt.
- **`data-proxy/index.ts`** — keep `due_at` accepted on the explicit `create_card` action (that's the MCP path where the user/Claude explicitly passes a date), but strip it from the `process_brain_dump` action's mapping so a date can never enter that way either.

Result: nothing the AI generates can ever populate `due_at`. Only the user's manual date picker, the calendar event sync (`google_event_id` flow), and explicit MCP `create_card` calls can.

### 2. Soften "overdue" language in the weekly review

- **`generate-life-review/index.ts`** — rename the section "Pressing or overdue threads right now" → "Threads still open" and drop the `[due …]` prefix in favor of plain titles. The model already weaves prose; without the word "overdue" in its source document, it stops echoing it.

### 3. Stop amplifying dates in Run My Day

- **`generate-daily-plan/index.ts`** — drop the `(due: Mar 5)` annotation from the card list and remove the "approaching deadlines first" / "deadline is close" rules from the system prompt. The plan becomes a calm rundown of what's on the plate, not a deadline tracker. (Calendar items still flow through `calendarSummary`, which is the correct place for actual time-bound things.)

### 4. One-time cleanup of existing AI-assigned dates

Cards that were created before this change and got an AI date will still look "due". Two options — I'll go with the safer one by default:

- **Default:** clear `due_at` on any card where `source IN ('voice', 'brain_dump', 'text', 'extension')` AND `google_event_id IS NULL` AND the card was created before today. This wipes only AI-assigned dates and preserves anything tied to a real calendar event. Run as a one-off SQL migration.

If you'd rather keep history intact and only fix new items going forward, say so and I'll skip step 4.

## Files touched

- `supabase/functions/process-brain-dump/index.ts`
- `supabase/functions/process-stream/index.ts`
- `supabase/functions/data-proxy/index.ts`
- `supabase/functions/generate-life-review/index.ts`
- `supabase/functions/generate-daily-plan/index.ts`
- One migration: `UPDATE cards SET due_at = NULL WHERE …` (step 4)

No client UI changes — the date pill in `HomeView` already only renders when `dueAt` exists, so it'll just stop showing for items that no longer have AI-assigned dates.

## What this changes for you

- Voice notes, brain dumps, screenshots, emails, extension captures → never get a due date unless you add one yourself in the card detail.
- The weekly briefing stops talking about "overdue" or "pressing deadlines."
- Run My Day reads as a calm overview, not a deadline dashboard.
- Existing AI-assigned dates get wiped (step 4); your manually-picked dates and calendar-synced events stay.
