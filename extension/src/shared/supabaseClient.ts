import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Anren] Supabase environment variables are missing. The side panel will run in a read-only/mock mode.",
  );
}

export type UserId = string;

/** Matches the public.cards table used by web + iOS + extension. */
export type Card = {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  body: string;
  source: string;
  status: string;
  category: string;
  image_url?: string | null;
  routed_type?: string | null;
  group_id?: string | null;
  google_event_id?: string | null;
  due_at?: string | null;
  created_at: string;
  updated_at: string;
};

let client: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

/**
 * Fetch recent cards captured from the extension ("Resting here").
 * If source filter is null, returns all cards for the user.
 */
export async function fetchRecentCards(
  limit = 20,
  sourceFilter: string | null = "extension",
): Promise<Card[]> {
  const supabase = getClient();
  if (!supabase) return [];

  let query = supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sourceFilter) {
    query = query.eq("source", sourceFilter);
  }

  const { data, error } = await query;

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to fetch cards", error);
    return [];
  }

  return (data as Card[]) ?? [];
}

/**
 * Create a card from the extension's "Hold this" action.
 * RLS requires auth.uid() = user_id, so the user must be authenticated.
 */
export async function createCard(
  fields: {
    title: string;
    body: string;
    summary?: string;
    image_url?: string | null;
  },
): Promise<Card | null> {
  const supabase = getClient();
  if (!supabase) {
    // eslint-disable-next-line no-console
    console.warn("[Anren] Cannot save: Supabase not configured.");
    return null;
  }

  // Get the authenticated user — RLS will enforce ownership
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // eslint-disable-next-line no-console
    console.error("[Anren] Cannot save: user not authenticated.");
    return null;
  }

  const { data, error } = await supabase
    .from("cards")
    .insert({
      user_id: user.id,
      title: fields.title,
      body: fields.body,
      summary: fields.summary ?? "",
      source: "extension",
      status: "active",
      category: "uncategorized",
      image_url: fields.image_url ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to create card", error);
    return null;
  }

  return data as Card;
}
