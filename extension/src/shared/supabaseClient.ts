import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // We keep this as a runtime warning instead of throwing so that the
  // extension can still render a graceful UI even if env is misconfigured.
  // eslint-disable-next-line no-console
  console.warn(
    "[Anren] Supabase environment variables are missing. The side panel will run in a read-only/mock mode.",
  );
}

// For now we assume a single dev user and thread that identity explicitly
// through helper functions. This can later be replaced with real auth.
export type UserId = string;

export type Task = {
  id: string;
  user_id: UserId;
  title: string;
  notes?: string | null;
  due_at?: string | null;
  scope?: "today" | "week" | "someday" | null;
  status?: "open" | "in_progress" | "done" | null;
  created_at?: string;
};

export type IntakeItem = {
  id: string;
  user_id: UserId;
  raw_text: string;
  source: "chrome_side_panel";
  created_at?: string;
  source_url?: string | null;
  source_title?: string | null;
};

let client: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export async function fetchRecentIntakeItems(
  userId: UserId,
  limit = 20,
): Promise<IntakeItem[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("intake_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to fetch intake items", error);
    return [];
  }

  return (data as IntakeItem[]) ?? [];
}

export async function fetchTasksForToday(userId: UserId): Promise<Task[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("due_at", start.toISOString())
    .lt("due_at", end.toISOString())
    .order("due_at", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to fetch today tasks", error);
    return [];
  }

  return (data as Task[]) ?? [];
}

export async function fetchTasksForThisWeek(
  userId: UserId,
): Promise<Task[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7,
  );

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("due_at", start.toISOString())
    .lt("due_at", end.toISOString())
    .order("due_at", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to fetch week tasks", error);
    return [];
  }

  return (data as Task[]) ?? [];
}

export async function createTasks(
  userId: UserId,
  tasks: Omit<Task, "id" | "user_id" | "created_at">[],
): Promise<Task[]> {
  const supabase = getClient();
  if (!supabase || tasks.length === 0) return [];

  const payload = tasks.map((task) => ({
    ...task,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("*");

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to create tasks", error);
    return [];
  }

  return (data as Task[]) ?? [];
}

export async function createIntakeFallback(
  userId: UserId,
  rawText: string,
  options?: { source_url?: string; source_title?: string },
): Promise<IntakeItem | null> {
  const supabase = getClient();
  if (!supabase) {
    // eslint-disable-next-line no-console
    console.warn("[Anren] Cannot save: Supabase URL or anon key is missing.");
    return null;
  }

  // Base payload: only columns that exist in the minimal schema (no source_url/source_title
  // unless your table has them). Supabase returns an error if we insert unknown columns.
  const basePayload = {
    user_id: userId,
    raw_text: rawText,
    source: "chrome_side_panel" as const,
  };

  // Try with optional columns first; if that fails (e.g. column doesn't exist), retry without.
  const payloadWithSource: Record<string, unknown> = { ...basePayload };
  if (options?.source_url != null) payloadWithSource.source_url = options.source_url;
  if (options?.source_title != null) payloadWithSource.source_title = options.source_title;

  const { data: dataWith, error: errorWith } = await supabase
    .from("intake_items")
    .insert(payloadWithSource)
    .select("*")
    .single();

  if (!errorWith && dataWith) {
    return dataWith as IntakeItem;
  }

  // If error might be due to missing columns (e.g. source_url/source_title), retry with base only.
  const isColumnError =
    errorWith?.code === "42703" ||
    (errorWith?.message && /column .* does not exist/i.test(errorWith.message));

  if (isColumnError && (options?.source_url != null || options?.source_title != null)) {
    const { data: dataBase, error: errorBase } = await supabase
      .from("intake_items")
      .insert(basePayload)
      .select("*")
      .single();
    if (!errorBase && dataBase) {
      return dataBase as IntakeItem;
    }
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to create intake item (base)", errorBase);
    return null;
  }

  // eslint-disable-next-line no-console
  console.error("[Anren] failed to create intake item", errorWith);
  return null;
}

