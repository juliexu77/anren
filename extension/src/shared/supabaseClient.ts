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

/**
 * chrome.storage.local adapter for Supabase auth session persistence.
 * Falls back to localStorage when chrome.storage is unavailable (dev mode).
 */
const chromeStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const chromeAny = globalThis as unknown as { chrome?: { storage?: { local?: { get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void } } } };
        if (chromeAny.chrome?.storage?.local) {
          chromeAny.chrome.storage.local.get([key], (items) => {
            resolve((items[key] as string) ?? null);
          });
        } else {
          resolve(localStorage.getItem(key));
        }
      } catch {
        resolve(localStorage.getItem(key));
      }
    });
  },
  setItem: (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const chromeAny = globalThis as unknown as { chrome?: { storage?: { local?: { set: (items: Record<string, unknown>, cb?: () => void) => void } } } };
        if (chromeAny.chrome?.storage?.local) {
          chromeAny.chrome.storage.local.set({ [key]: value }, () => resolve());
        } else {
          localStorage.setItem(key, value);
          resolve();
        }
      } catch {
        localStorage.setItem(key, value);
        resolve();
      }
    });
  },
  removeItem: (key: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const chromeAny = globalThis as unknown as { chrome?: { storage?: { local?: { remove: (keys: string[], cb?: () => void) => void } } } };
        if (chromeAny.chrome?.storage?.local) {
          chromeAny.chrome.storage.local.remove([key], () => resolve());
        } else {
          localStorage.removeItem(key);
          resolve();
        }
      } catch {
        localStorage.removeItem(key);
        resolve();
      }
    });
  },
};

let client: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

/**
 * Sign in with Google OAuth. Opens a new tab for Google consent.
 * The redirect points to the web app's callback; the extension picks up
 * the session via onAuthStateChange + chrome.storage.local persistence.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const supabase = getClient();
  if (!supabase) return { error: new Error("Supabase not configured") };

  const webAppOrigin = (SUPABASE_URL || "").replace(/\/+$/, "").includes("supabase")
    ? "https://anren.lovable.app"
    : window.location.origin;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: webAppOrigin + "/google-callback",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
        scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
      },
    },
  });

  return { error: error ? new Error(error.message) : null };
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

/**
 * Migrate locally-stored cards to the database after auth.
 */
export async function migrateLocalCards(): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  return new Promise((resolve) => {
    const chromeAny = globalThis as unknown as { chrome?: { storage?: { local?: { get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void; remove: (keys: string[]) => void } } } };
    if (!chromeAny.chrome?.storage?.local) {
      resolve();
      return;
    }

    chromeAny.chrome.storage.local.get(["anren_local_cards"], async (items) => {
      const cards = (items.anren_local_cards as Array<{ title: string; body: string; source: string }>) || [];
      if (cards.length === 0) {
        resolve();
        return;
      }

      const rows = cards.map((c) => ({
        user_id: user.id,
        title: c.title,
        body: c.body,
        source: c.source || "extension",
        status: "active" as const,
        category: "uncategorized" as const,
        summary: "",
      }));

      const { error } = await supabase.from("cards").insert(rows);
      if (!error) {
        chromeAny.chrome!.storage!.local!.remove(["anren_local_cards"]);
      }
      resolve();
    });
  });
}
