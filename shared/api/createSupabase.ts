/**
 * Shared Supabase client factory — use from web app (with env) or extension (with config).
 * Web app continues to use src/integrations/supabase/client.ts which uses Vite env.
 * Extension should call createSupabaseClient(url, anonKey) with values from storage or options.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Extension may not have the full generated Database type; use a minimal shape if needed.
// For typed usage from the web app, the web app's client still uses the full Database type.
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: { auth?: { storage?: Storage; persistSession?: boolean; autoRefreshToken?: boolean } }
): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage: options?.auth?.storage ?? localStorage,
      persistSession: options?.auth?.persistSession ?? true,
      autoRefreshToken: options?.auth?.autoRefreshToken ?? true,
    },
  });
}
