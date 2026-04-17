import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ data: null, error: "Method not allowed" }, 405);
  }

  // Auth check
  const PROXY_SECRET = Deno.env.get("PROXY_SECRET");
  if (!PROXY_SECRET) {
    return json({ data: null, error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${PROXY_SECRET}`) {
    return json({ data: null, error: "Unauthorized" }, 401);
  }

  // Parse body
  let action: string;
  let params: Record<string, unknown>;
  try {
    const body = await req.json();
    action = body.action;
    params = body.params || {};
  } catch {
    return json({ data: null, error: "Invalid JSON body" }, 400);
  }

  if (!action || typeof action !== "string") {
    return json({ data: null, error: "Missing action" }, 400);
  }

  // Service-role client (bypasses RLS)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Helper: require user_id
  const user_id = params.user_id as string | undefined;

  try {
    switch (action) {
      // ── READ ACTIONS ──

      case "get_todo_list": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const limit =
          typeof params.limit === "number" && params.limit > 0
            ? Math.min(params.limit as number, 500)
            : 100;
        let q = supabase
          .from("cards")
          .select("*")
          .eq("user_id", user_id)
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (params.category && typeof params.category === "string") {
          q = q.eq("category", params.category);
        }
        if (params.status && typeof params.status === "string") {
          q = q.eq("status", params.status);
        }
        const { data, error } = await q;
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "get_people": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        let q = supabase.from("people").select("*").eq("user_id", user_id).order("name").limit(50);
        if (params.search && typeof params.search === "string") {
          q = q.ilike("name", `%${params.search}%`);
        }
        const { data, error } = await q;
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "get_weekly_synthesis": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        let q = supabase
          .from("weekly_syntheses")
          .select("*")
          .eq("user_id", user_id)
          .order("week_start", { ascending: false })
          .limit(1);
        if (params.week_start && typeof params.week_start === "string") {
          q = q.eq("week_start", params.week_start);
        }
        const { data, error } = await q;
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: data?.[0] ?? null, error: null });
      }

      case "get_daily_brief": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const { data, error } = await supabase
          .from("daily_brief_settings")
          .select("*")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: data?.[0] ?? null, error: null });
      }

      case "get_texture": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const periodType = (params.period_type as string) || "weekly";
        const { data, error } = await supabase
          .from("reflection_summaries")
          .select("texture, what_created_it, recurring_patterns, unresolved_threads, what_this_reveals, period_start, period_type")
          .eq("user_id", user_id)
          .eq("period_type", periodType)
          .order("period_start", { ascending: false })
          .limit(1);
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: data?.[0] ?? null, error: null });
      }

      case "get_reflections": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const limit =
          typeof params.limit === "number" && params.limit > 0
            ? Math.min(params.limit as number, 30)
            : 7;
        let rq = supabase
          .from("reflections")
          .select("reflection_date, texture, texture_why, energy_givers, energy_drainers, unresolved_threads, summary")
          .eq("user_id", user_id)
          .order("reflection_date", { ascending: false })
          .limit(limit);
        if (params.start_date && typeof params.start_date === "string") {
          rq = rq.gte("reflection_date", params.start_date);
        }
        if (params.end_date && typeof params.end_date === "string") {
          rq = rq.lte("reflection_date", params.end_date);
        }
        const { data: refData, error: refErr } = await rq;
        if (refErr) return json({ data: null, error: refErr.message }, 500);
        return json({ data: refData, error: null });
      }

      case "get_household": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        // Find household where user is owner or member
        const { data: memberships, error: memErr } = await supabase
          .from("household_members")
          .select("household_id, role")
          .eq("user_id", user_id);
        if (memErr) return json({ data: null, error: memErr.message }, 500);

        // Also check if user owns a household
        const { data: owned, error: ownErr } = await supabase
          .from("households")
          .select("id")
          .eq("owner_id", user_id);
        if (ownErr) return json({ data: null, error: ownErr.message }, 500);

        const householdIds = new Set<string>();
        memberships?.forEach((m) => householdIds.add(m.household_id));
        owned?.forEach((h) => householdIds.add(h.id));

        if (householdIds.size === 0) {
          return json({ data: { household: null, members: [] }, error: null });
        }

        const hid = Array.from(householdIds)[0];
        const { data: members, error: membersErr } = await supabase
          .from("household_members")
          .select("user_id, role, joined_at")
          .eq("household_id", hid);
        if (membersErr) return json({ data: null, error: membersErr.message }, 500);

        // Get profiles for all members
        const memberIds = members?.map((m) => m.user_id) || [];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email, avatar_url")
          .in("user_id", memberIds);

        return json({
          data: {
            household_id: hid,
            members: members?.map((m) => ({
              ...m,
              profile: profiles?.find((p) => p.user_id === m.user_id) || null,
            })),
          },
          error: null,
        });
      }

      // ── WRITE ACTIONS ──

      case "add_card": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const title = params.title as string;
        if (!title) return json({ data: null, error: "title required" }, 400);

        const row: Record<string, unknown> = {
          user_id,
          title,
          body: (params.body as string) || "",
          source: (params.source as string) || "companion",
          category: (params.category as string) || "uncategorized",
          status: "active",
        };
        if (params.due_at) row.due_at = params.due_at;

        const { data, error } = await supabase.from("cards").insert(row).select().single();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "complete_card": {
        const card_id = params.card_id as string;
        if (!card_id) return json({ data: null, error: "card_id required" }, 400);
        const { data, error } = await supabase
          .from("cards")
          .update({ status: "complete" })
          .eq("id", card_id)
          .select()
          .single();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "archive_card": {
        const card_id = params.card_id as string;
        if (!card_id) return json({ data: null, error: "card_id required" }, 400);
        const { data, error } = await supabase
          .from("cards")
          .update({ status: "archived" })
          .eq("id", card_id)
          .select()
          .single();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "process_brain_dump": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const text = params.text as string;
        if (!text) return json({ data: null, error: "text required" }, 400);

        // Call the process-brain-dump edge function server-to-server
        const brainDumpRes = await fetch(
          `${supabaseUrl}/functions/v1/process-brain-dump`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
          }
        );

        if (!brainDumpRes.ok) {
          const errText = await brainDumpRes.text();
          return json({ data: null, error: `Brain dump processing failed: ${errText}` }, 500);
        }

        const parsed = await brainDumpRes.json();
        const items = parsed.items || [];

        // Insert resulting cards
        if (items.length > 0) {
          const rows = items.map((item: { title: string; type?: string; theme?: string }) => ({
            user_id,
            title: item.title,
            body: item.title,
            source: "companion",
            category: item.theme || "uncategorized",
            routed_type: item.type || null,
            status: "active",
          }));

          const { error: insertErr } = await supabase.from("cards").insert(rows);
          if (insertErr) return json({ data: null, error: insertErr.message }, 500);
        }

        return json({ data: { items_created: items.length, items }, error: null });
      }

      // ── ADDRESS BOOK ──

      case "add_address_entry": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const household_name = params.household_name as string;
        if (!household_name) return json({ data: null, error: "household_name required" }, 400);

        const entryRow: Record<string, unknown> = {
          user_id,
          household_name,
          address_line_1: (params.address_line_1 as string) || "",
          address_line_2: (params.address_line_2 as string) || "",
          city: (params.city as string) || "",
          state: (params.state as string) || "",
          zip: (params.zip as string) || "",
          country: (params.country as string) || "US",
        };

        const { data: newEntry, error: entryErr } = await supabase
          .from("address_book_entries")
          .insert(entryRow)
          .select()
          .single();
        if (entryErr) return json({ data: null, error: entryErr.message }, 500);

        const contacts = Array.isArray(params.contacts) ? params.contacts : [];
        if (contacts.length > 0) {
          const contactRows = (contacts as any[]).map((c: any) => ({
            entry_id: newEntry.id,
            user_id,
            first_name: c.first_name || "",
            last_name: c.last_name || "",
            email: c.email || null,
            phone: c.phone || null,
            birthday: c.birthday || null,
            is_primary: c.is_primary || false,
          }));
          await supabase.from("address_book_contacts").insert(contactRows);
        }

        return json({ data: newEntry, error: null });
      }

      case "search_address_book": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const query = params.query as string;
        if (!query) return json({ data: null, error: "query required" }, 400);

        // Search contacts by name
        const { data: matchedContacts, error: scErr } = await supabase
          .from("address_book_contacts")
          .select("*")
          .eq("user_id", user_id)
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
        if (scErr) return json({ data: null, error: scErr.message }, 500);

        // Search entries by household name
        const { data: matchedEntries, error: seErr } = await supabase
          .from("address_book_entries")
          .select("*")
          .eq("user_id", user_id)
          .ilike("household_name", `%${query}%`);
        if (seErr) return json({ data: null, error: seErr.message }, 500);

        // Collect all relevant entry IDs
        const entryIds = new Set<string>();
        (matchedContacts || []).forEach((c: any) => entryIds.add(c.entry_id));
        (matchedEntries || []).forEach((e: any) => entryIds.add(e.id));

        if (entryIds.size === 0) {
          return json({ data: [], error: null });
        }

        // Fetch full entries + all their contacts
        const ids = Array.from(entryIds);
        const { data: fullEntries } = await supabase
          .from("address_book_entries")
          .select("*")
          .in("id", ids);
        const { data: fullContacts } = await supabase
          .from("address_book_contacts")
          .select("*")
          .in("entry_id", ids);

        const results = (fullEntries || []).map((e: any) => ({
          ...e,
          contacts: (fullContacts || []).filter((c: any) => c.entry_id === e.id),
        }));

        return json({ data: results, error: null });
      }

      // ── REFLECTIONS ──

      case "log_reflection": {
        if (!user_id) return json({ data: null, error: "user_id required" }, 400);
        const text = params.text as string;
        if (!text) return json({ data: null, error: "text required" }, 400);

        // Call process-reflection edge function to extract structured data
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
        const processResp = await fetch(`${supabaseUrl}/functions/v1/process-reflection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey!,
          },
          body: JSON.stringify({ transcript: text }),
        });

        if (!processResp.ok) {
          const errText = await processResp.text();
          return json({ data: null, error: `process-reflection failed: ${errText}` }, 500);
        }

        const processed = await processResp.json();

        const { data, error } = await supabase.from("reflections").insert({
          user_id,
          raw_transcript: text,
          texture: processed.texture,
          texture_why: processed.texture_why,
          what_this_reveals: processed.what_this_reveals,
          energy_givers: processed.energy_givers,
          energy_drainers: processed.energy_drainers,
          unresolved_threads: processed.unresolved_threads,
          summary: processed.summary,
          reflection_date: params.date || new Date().toISOString().split("T")[0],
        }).select().single();

        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      default:
        return json({ data: null, error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ data: null, error: String(err) }, 500);
  }
});
