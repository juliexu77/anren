import { getClient, type UserId } from "./supabaseClient";

/**
 * Get the current authenticated user's ID.
 * Returns null if no session exists.
 */
export async function getCurrentUserId(): Promise<UserId | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
