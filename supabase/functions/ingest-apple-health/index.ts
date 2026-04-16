import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Ingest Apple HealthKit samples pushed from the iOS device.
 * Body: {
 *   sleep?: [{ start, end, duration_minutes, source? }],
 *   steps?: [{ day, count }],          // daily aggregates
 *   workouts?: [{ start, end, type, duration_minutes, calories?, distance_m?, avg_hr? }],
 *   heart_rate?: [{ recorded_at, bpm }],
 *   hrv?: [{ recorded_at, ms }],
 * }
 *
 * All samples are deduped by (user_id, provider, signal_type, external_id) where
 * external_id is built from the start timestamp + type so re-ingesting is idempotent.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const rows: any[] = [];

    const sleep = Array.isArray(body.sleep) ? body.sleep : [];
    for (const s of sleep) {
      if (!s.start) continue;
      rows.push({
        user_id: user.id,
        provider: "apple_health",
        signal_type: "sleep",
        external_id: `sleep:${s.start}`,
        recorded_at: s.start,
        value: {
          start: s.start,
          end: s.end ?? null,
          duration_minutes: s.duration_minutes ?? null,
          source: s.source ?? null,
        },
      });
    }

    const steps = Array.isArray(body.steps) ? body.steps : [];
    for (const st of steps) {
      if (!st.day) continue;
      rows.push({
        user_id: user.id,
        provider: "apple_health",
        signal_type: "steps",
        external_id: `steps:${st.day}`,
        recorded_at: `${st.day}T00:00:00Z`,
        value: { day: st.day, count: st.count ?? 0 },
      });
    }

    const workouts = Array.isArray(body.workouts) ? body.workouts : [];
    for (const w of workouts) {
      if (!w.start) continue;
      rows.push({
        user_id: user.id,
        provider: "apple_health",
        signal_type: "workout",
        external_id: `workout:${w.start}:${w.type ?? "unknown"}`,
        recorded_at: w.start,
        value: {
          start: w.start,
          end: w.end ?? null,
          type: w.type ?? null,
          duration_minutes: w.duration_minutes ?? null,
          calories: w.calories ?? null,
          distance_m: w.distance_m ?? null,
          avg_hr: w.avg_hr ?? null,
        },
      });
    }

    const hr = Array.isArray(body.heart_rate) ? body.heart_rate : [];
    for (const h of hr) {
      if (!h.recorded_at) continue;
      rows.push({
        user_id: user.id,
        provider: "apple_health",
        signal_type: "heart_rate",
        external_id: `hr:${h.recorded_at}`,
        recorded_at: h.recorded_at,
        value: { bpm: h.bpm ?? null },
      });
    }

    const hrv = Array.isArray(body.hrv) ? body.hrv : [];
    for (const h of hrv) {
      if (!h.recorded_at) continue;
      rows.push({
        user_id: user.id,
        provider: "apple_health",
        signal_type: "hrv",
        external_id: `hrv:${h.recorded_at}`,
        recorded_at: h.recorded_at,
        value: { ms: h.ms ?? null },
      });
    }

    let count = 0;
    if (rows.length > 0) {
      const { error } = await service
        .from("health_signals")
        .upsert(rows, { onConflict: "user_id,provider,signal_type,external_id" });
      if (error) throw error;
      count = rows.length;
    }

    // Mark connection active + last synced
    await service
      .from("user_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "apple_health",
          status: "active",
          last_synced_at: new Date().toISOString(),
          last_sync_error: null,
        },
        { onConflict: "user_id,provider" }
      );

    return new Response(JSON.stringify({ ok: true, count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ingest-apple-health error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
