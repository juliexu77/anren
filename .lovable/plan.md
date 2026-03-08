

## Fix: Household RLS Policies Are Restrictive Instead of Permissive

### Root Cause
All household-related RLS policies are RESTRICTIVE, meaning they're ANDed together. For the owner to SELECT their own household, they must pass BOTH:
1. "Owner can do everything" — ✓ (owner_id matches)
2. "Members can view household" — ✗ (owner isn't in household_members)

This blocks the owner from reading their own household, which cascades to block invite creation (the invites policy subqueries households).

### Fix
One database migration to drop and recreate all household-related policies as explicitly PERMISSIVE:

**Tables affected:** `households`, `household_members`, `household_invites`

All 6 policies on these 3 tables get dropped and recreated with `AS PERMISSIVE` so they OR together instead of AND. No code changes needed — just the RLS fix.

Also recreate the cross-table SELECT policies on `cards`, `profiles`, and `daily_brief_settings` as PERMISSIVE for the same reason (they're currently restrictive, which means they AND with the owner's own SELECT policy — though this happens to work since both pass for different users, it's still incorrect semantically).

