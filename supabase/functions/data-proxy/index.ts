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
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (action) {
      case "get_people": {
        let q = supabase.from("people").select("*").order("name").limit(50);
        if (params.search && typeof params.search === "string") {
          q = q.ilike("name", `%${params.search}%`);
        }
        const { data, error } = await q;
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "get_cards": {
        const limit =
          typeof params.limit === "number" && params.limit > 0
            ? Math.min(params.limit as number, 100)
            : 20;
        let q = supabase
          .from("cards")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (params.category && typeof params.category === "string") {
          q = q.eq("category", params.category);
        }
        const { data, error } = await q;
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }

      case "get_weekly_synthesis": {
        let q = supabase
          .from("weekly_syntheses")
          .select("*")
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
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("daily_brief_settings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: data?.[0] ?? null, error: null });
      }

      default:
        return json(
          { data: null, error: `Unknown action: ${action}` },
          400
        );
    }
  } catch (err) {
    return json({ data: null, error: String(err) }, 500);
  }
});
