# Anren Chrome Extension – V1 Build Plan (Mental Load Vault)

This plan aligns the PRD “Mental Load Vault” with the codebase and Supabase. It **reviews everything** and recommends a small, intentional data-model evolution for `intake_items` plus the product and UX work. The goal is the best plan—not “no schema changes” and not “change everything.”

---

## 1. Current architecture

### Supabase (what you have today)

- **`tasks`**  
  `id`, `user_id`, `title`, `notes`, `due_at`, `scope` (today | week | someday), `status` (open | in_progress | done), `created_at`.  
  Used for “today” and “this week” and for intake API output. **No change recommended**—fits the PRD and works.

- **`intake_items`**  
  `id`, `user_id`, `raw_text`, `source` (e.g. `chrome_side_panel`), `created_at`.  
  Used for raw captures when the API doesn’t return tasks or fails. This is the right table for “Held Item” / “Resting Here”; we only extend it slightly below.

- **Auth**  
  Single dev user (e.g. `VITE_DEV_USER_ID`). “No login required” stays. No auth schema change.

### Extension

- Side panel only (Calendar/Gmail); intake → API or `createIntakeFallback`; Today/Week from `tasks`. All of that stays.

---

## 2. Data model: recommended evolution (intake_items only)

The PRD describes a **Held Item** as: title, description, source (URL), timestamp, not time-bound, lives in “Resting Here.”  
Right now we only have `raw_text` and `source` (origin enum). To support the PRD well without overbuilding, add **optional** columns and keep the rest as-is.

| Add to `intake_items`   | Type   | Rationale |
|-------------------------|--------|-----------|
| **`title`**             | text, nullable | PRD has “title” for a Held Item. Today we’d derive it from the first line of `raw_text` in the UI. Storing it gives a stable list label, room for the intake API to set a title later, and avoids parsing. **Backward compatible:** existing rows leave `title` null → UI uses first line of `raw_text`. |
| **`source_url`**        | text, nullable | PRD: “source (URL).” Instant Intake captures the page URL; if we don’t persist it, we lose “where this came from” after the panel closes. Enables “From: [page]” per item in Resting Here and “open source” in Review & Schedule. **Backward compatible:** null for old rows and for manual type-in. |
| **`source_title`**      | text, nullable | Page title (e.g. “Inbox – me@gmail.com”) is better for display than a raw URL. Optional but improves Resting Here and any context chip. **Backward compatible:** null when not available. |

**Keep as-is:** `raw_text` = main body/description; `source` = origin enum (`chrome_side_panel`); `created_at` = timestamp. No new tables. **`tasks`** table unchanged.

**Migration:** Add the three columns with `DEFAULT NULL`. No backfill required. Code should treat null as “derive title from `raw_text`” and “don’t show source” so old and new rows both work.

---

## 3. What to build (in order)

### Phase A – Resting Here (list, copy, and data shape)

**Goal:** Panel centers on “Resting Here” with PRD copy; support both current schema and the new optional columns.

1. **Schema (if you adopt the evolution above)**  
   Add `title`, `source_url`, `source_title` to `intake_items` (nullable). Update `IntakeItem` in `supabaseClient.ts` and any insert/select to include these when present.

2. **Fetch and show recent intake items**  
   In `supabaseClient.ts`: add `fetchRecentIntakeItems(userId, limit?)` → `from('intake_items').select(...).eq('user_id', userId).order('created_at', { ascending: false }).limit(20)`.  
   In the UI: **“Resting Here”** section. Each row: use `title` if present, else first line (or short preview) of `raw_text`; show `source_title` or truncated `source_url` if present; relative time from `created_at`; no due/scheduling.

3. **Copy and structure**  
   Header/tagline: “Where the mental load rests” and calm subcopy. Empty state: e.g. “Highlight anything on a page and hold it here.” After first item: “Everything you add rests here until you decide.” Keep “Hold this” and the existing status messages.

4. **Today / This week**  
   Keep existing `tasks` fetch and display as a secondary section (e.g. “When you’re ready to schedule” or collapsible) so Resting Here is primary.

**Deliverable:** Resting Here is the main list; copy matches PRD; display works with or without the new columns (null-safe).

---

### Phase B – Instant Intake (pre-fill and persist context)

**Goal:** Opening the panel from a tab pre-fills the intake box (selection or page title + URL) and, if you added the new columns, persist source when saving.

1. **Background: capture tab context when opening panel**  
   When opening the side panel (e.g. on `chrome.action.onClicked`): get active tab (`chrome.tabs.query`), read `tab.url` and `tab.title`, and optionally selected text via `chrome.scripting.executeScript` (e.g. `() => window.getSelection()?.toString()`). Write to `chrome.storage.local` (e.g. `anren_panel_context`: `{ pageTitle, pageUrl, selectedText }`).

2. **Side panel: read context and pre-fill**  
   On load, read `anren_panel_context`. If `selectedText` is non-empty, use it as the initial intake value; else use e.g. `pageTitle + "\n" + pageUrl`. Optionally clear context after use so the next open doesn’t reuse it.

3. **Context chip**  
   Show current page (title or truncated URL) near the intake box. Use runtime context; when the user submits, also pass `source_url` and `source_title` into the create-intake path if the schema has those columns.

4. **Create intake with optional source**  
   Extend `createIntakeFallback` (and any direct insert) to accept optional `title`, `source_url`, `source_title`. When Instant Intake is used, set them from the panel context; otherwise leave null. If the DB doesn’t have the columns yet, omit them in the insert so the app still runs.

**Deliverable:** Pre-fill from tab; optional context chip; source (and optional title) persisted when columns exist.

---

### Phase C – Progressive reveal (Review & Schedule)

**Goal:** After 2–3 items in Resting Here, show a gentle “Review & Schedule” nudge; no extra schema.

1. **Stage 1**  
   Empty state and “everything rests here” copy (Phase A).

2. **Stage 2**  
   When count of `intake_items` (for the user) ≥ 2 (or 3), show a card: “You’re holding a few things. Ready to turn one into time?” with button “Review & Schedule.” That can open an in-panel review view listing recent Resting Here items; later, “schedule” can create a task or open calendar flow.

3. **Stage 3 & 4 (later)**  
   Account prompt and calendar integration as follow-ups; out of scope for initial V1.

**Deliverable:** Count-based “Review & Schedule” card and a simple review list; optional “open source” link per item when `source_url` is present.

---

### Phase D – Polish and edge cases

- **Errors:** Keep intake API failure → `createIntakeFallback` and reassuring messaging.
- **No Supabase:** Keep mock tasks and graceful message when Supabase isn’t configured.
- **Refetch:** After “Hold this,” refetch or append to Resting Here so the new item appears without full reload.
- **Null-safe UI:** Everywhere we use `title`, `source_url`, `source_title`, handle null so existing data and partial context still work.

---

## 4. What we’re not changing

- **`tasks`** table and its usage (today/week, scope, status).
- Auth: still single dev user; no sign-in/sign-up in V1.
- No new tables; no removal of `raw_text` or `source` enum.
- Side panel only; no content script or injected UI.

---

## 5. Summary

| PRD element       | Implementation |
|-------------------|----------------|
| Held Item         | `intake_items` with optional `title`, `source_url`, `source_title`; body = `raw_text`, time = `created_at`. |
| Resting Here      | Fetch recent `intake_items`; display with title/preview, optional source, relative time. |
| Instant Intake    | Background captures tab + selection; panel pre-fills; on submit, persist source (and optional title) when columns exist. |
| Side panel layout | Resting Here primary; Today/Week secondary; PRD copy and empty state. |
| Progressive reveal| Count-based “Review & Schedule” card; simple review view; optional “open source” when `source_url` present. |
| No login required | Unchanged (dev user). |

**Build order:** A → B → C → D.  
**Data model:** Optional evolution of `intake_items` only (three nullable columns); everything else unchanged. Code stays backward compatible with or without the new columns.
