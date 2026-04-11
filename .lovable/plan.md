

## Address Book Feature

### The Problem
You want to manage a holiday-card-ready address book inside Anren. Key complexities:
- Minted uses a **household** model: "The Han Family" at one address, but individual names (A Han, B Han) within
- You want **birthdays** tracked per person
- Upload from Excel, download in Minted-compatible CSV format

### Data Model

The existing `people` table is too flat. We need a **households + contacts** model:

**New table: `address_book_entries`** (one row = one household/address)
- `id`, `user_id`, `household_name` (e.g. "The Han Family")
- `address_line_1`, `address_line_2`, `city`, `state`, `zip`, `country`
- `created_at`, `updated_at`

**New table: `address_book_contacts`** (one row = one person within a household)
- `id`, `entry_id` (FK to address_book_entries), `user_id`
- `first_name`, `last_name`
- `email`, `phone`
- `birthday` (date, nullable)
- `is_primary` (boolean — whose name goes first on the envelope)

This maps cleanly to the Minted format where one row = one household with fields like `Name 1`, `Name 2`, `Address`, `City`, `State`, `Zip`.

RLS: scoped to `user_id = auth.uid()` on both tables.

### Upload Flow

1. User uploads an Excel/CSV file from the Address Book page
2. We parse it client-side (using SheetJS/xlsx library, already common)
3. Auto-detect columns via header matching (Minted headers: "First Name", "Last Name", "Address", "City", "State", "Zip", "Country") — also support generic formats
4. Preview the parsed data in a table before confirming import
5. On confirm, upsert into `address_book_entries` + `address_book_contacts`

### Download Flow

1. "Export for Minted" button
2. Generates a CSV with Minted-compatible headers:
   - `Household Name`, `Name 1 First`, `Name 1 Last`, `Name 2 First`, `Name 2 Last`, `Address Line 1`, `Address Line 2`, `City`, `State`, `Zip Code`, `Country`
3. One row per household, up to 2 names per row

### UI

**New page: `/address-book`** accessible from settings or nav
- List view of all households, grouped alphabetically
- Each entry shows: household name, address, members with birthdays
- Inline edit for quick corrections
- "Upload spreadsheet" button (top)
- "Export for Minted" button (top)
- "Add household" button for manual entry
- Birthday indicators with upcoming-birthday highlighting

**Add/Edit sheet**: form with household name, address fields, and a repeatable "member" section (first name, last name, birthday, email, phone).

### MCP Integration

Add two actions to `data-proxy`:
- `get_address_book` — returns all entries + contacts for a user
- `add_address_entry` — add a household with contacts

### Files to Create/Modify

| File | Action |
|---|---|
| Migration | Create `address_book_entries` + `address_book_contacts` tables with RLS |
| `src/pages/AddressBook.tsx` | New page with list, upload, export |
| `src/components/AddressBookUpload.tsx` | Upload + parse + preview + confirm |
| `src/components/AddressBookEntrySheet.tsx` | Add/edit household form |
| `src/hooks/useAddressBook.ts` | CRUD hook for address book data |
| `src/App.tsx` | Add `/address-book` route |
| `src/pages/Index.tsx` or nav | Add link to address book |
| `supabase/functions/data-proxy/index.ts` | Add `get_address_book` and `add_address_entry` actions |
| `package.json` | Add `xlsx` library for spreadsheet parsing |

### Execution Order

1. DB migration (two tables + RLS)
2. Hook + page + components
3. Upload/download logic
4. Data-proxy actions for MCP
5. Nav integration

