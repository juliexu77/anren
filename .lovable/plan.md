

## Household Partner Invite Feature

### Overview
Primary user generates an invite link in Settings. Partner opens link, creates an account, joins the household. Partner sees a read-only mirror of the primary user's app. A weekly push notification nudges the partner to appreciate what their partner is holding.

### Database (4 new tables, 1 migration)

**`households`** — id, owner_id (uuid), created_at

**`household_members`** — id, household_id (FK), user_id (uuid), role (text, default 'viewer'), joined_at

**`household_invites`** — id, household_id (FK), token (unique text), expires_at (default now + 30 days), used_by (uuid[], tracks who joined but does NOT invalidate the token), created_at

**`household_nudges`** — tracking table so the weekly nudge cron knows who to notify

**RLS policies:**
- `households`: owner full CRUD; members SELECT
- `household_members`: owner INSERT/DELETE; member SELECT own row
- `household_invites`: owner INSERT/SELECT/DELETE; anon/authenticated SELECT by token (for join page)
- `cards`, `profiles`, `daily_brief_settings`: add SELECT policy allowing household members to read the owner's rows via a `is_household_member(auth.uid(), owner_id)` security definer function

### Security Definer Function

```sql
create or replace function public.is_household_member(_user_id uuid, _owner_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    join public.households h on h.id = hm.household_id
    where hm.user_id = _user_id and h.owner_id = _owner_id
  )
$$;
```

### Edge Function: `accept-invite`
- Validates token exists and hasn't expired
- Creates household membership for the authenticated user
- Appends user to `used_by` array on the invite (but keeps invite active)

### Edge Function: `nudge-partner` (cron, weekly)
- Queries household members with role='viewer' who have device tokens
- Counts the owner's active cards
- Sends APNs push: "Your partner is holding X things right now. Take a moment to notice."

### Frontend Changes

1. **Settings — "Partner" section** (below Account)
   - "Invite Partner" button → generates invite token, copies link
   - If invite exists, show the link with copy/share button and option to revoke
   - If partner has joined, show their name with option to remove

2. **`/invite/:token` route** (new page, public)
   - Fetches invite details (owner's display name)
   - Shows: "You've been invited to join [Name]'s household"
   - CTA: "Join" → if not logged in, redirect to auth with `?redirect=/invite/:token`
   - After auth, call `accept-invite` edge function → redirect to home

3. **Post-auth redirect handling**
   - Auth page stores redirect URL, navigates there after successful login
   - `/invite/:token` page detects authenticated user and auto-triggers join

4. **Read-only partner home**
   - New hook `useHousehold` — detects if current user is a viewer in any household, returns owner_id
   - `useCards` — if viewer, fetch owner's cards (RLS handles access)
   - `HomeView` — if viewer mode: hide add/edit/delete/brain dump/reorder controls, show banner "Viewing [Name]'s list"
   - Calendar and daily brief similarly fetch owner's data

5. **App.tsx** — add `/invite/:token` route

### Key Design Decisions
- Invite tokens are **reusable** (not single-use) and expire after **30 days**
- Owner can regenerate/revoke the link
- Weekly nudge push: "Your partner is holding X things right now. Take a moment to notice."
- One household per user (owner), one viewer per household (can expand later)

