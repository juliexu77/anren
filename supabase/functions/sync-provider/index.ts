import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Token refresh helpers ----------

async function refreshOAuthToken(
  service: SupabaseClient,
  userId: string,
  provider: string,
  refreshToken: string,
  tokenUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh failed (${provider}): ${await res.text()}`);
  const data = await res.json();
  const expiresAt = data.expires_at
    ? new Date(data.expires_at * 1000).toISOString()
    : new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await service
    .from("user_connections")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      token_expires_at: expiresAt,
    })
    .eq("user_id", userId)
    .eq("provider", provider);
  return data.access_token;
}

async function ensureFreshToken(
  service: SupabaseClient,
  userId: string,
  conn: any
): Promise<string> {
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const stillValid = expiresAt && expiresAt.getTime() > Date.now() + 60_000;
  if (stillValid) return conn.access_token;
  if (!conn.refresh_token) throw new Error("token expired, no refresh token");

  switch (conn.provider) {
    case "google_calendar":
      return refreshOAuthToken(
        service, userId, "google_calendar", conn.refresh_token,
        "https://oauth2.googleapis.com/token",
        Deno.env.get("GOOGLE_CLIENT_ID")!,
        Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      );
    case "whoop":
      return refreshOAuthToken(
        service, userId, "whoop", conn.refresh_token,
        "https://api.prod.whoop.com/oauth/oauth2/token",
        Deno.env.get("WHOOP_CLIENT_ID")!,
        Deno.env.get("WHOOP_CLIENT_SECRET")!,
      );
    case "oura":
      return refreshOAuthToken(
        service, userId, "oura", conn.refresh_token,
        "https://api.ouraring.com/oauth/token",
        Deno.env.get("OURA_CLIENT_ID")!,
        Deno.env.get("OURA_CLIENT_SECRET")!,
      );
    case "strava":
      return refreshOAuthToken(
        service, userId, "strava", conn.refresh_token,
        "https://www.strava.com/api/v3/oauth/token",
        Deno.env.get("STRAVA_CLIENT_ID")!,
        Deno.env.get("STRAVA_CLIENT_SECRET")!,
      );
    default:
      throw new Error(`refresh not implemented for ${conn.provider}`);
  }
}

// ---------- Sync implementations ----------

async function syncGoogleCalendar(
  service: SupabaseClient,
  userId: string,
  conn: any
): Promise<{ count: number }> {
  const accessToken = await ensureFreshToken(service, userId, conn);

  const timeMin = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
    `&singleEvents=true&orderBy=startTime&maxResults=250`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`google calendar fetch failed: ${await res.text()}`);
  const data = await res.json();
  const events = (data.items || []) as any[];
  if (events.length === 0) return { count: 0 };

  const rows = events
    .filter((e) => e.start?.dateTime || e.start?.date)
    .map((e) => ({
      user_id: userId,
      provider: "google_calendar",
      signal_type: "calendar_event",
      external_id: e.id,
      recorded_at: e.start.dateTime || `${e.start.date}T00:00:00Z`,
      value: {
        title: e.summary || "(untitled)",
        start: e.start.dateTime || e.start.date,
        end: e.end?.dateTime || e.end?.date || null,
        location: e.location || null,
        all_day: !e.start.dateTime,
      },
    }));

  const { error } = await service
    .from("health_signals")
    .upsert(rows, { onConflict: "user_id,provider,signal_type,external_id" });
  if (error) throw error;
  return { count: rows.length };
}

async function syncWhoop(
  service: SupabaseClient,
  userId: string,
  conn: any
): Promise<{ count: number }> {
  const accessToken = await ensureFreshToken(service, userId, conn);
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  async function pull(path: string) {
    const url = `https://api.prod.whoop.com${path}?start=${encodeURIComponent(start)}&limit=25`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`whoop ${path} failed: ${await res.text()}`);
    const data = await res.json();
    return (data.records || []) as any[];
  }

  const [recovery, sleep, workout, cycles] = await Promise.all([
    pull("/developer/v1/recovery"),
    pull("/developer/v1/activity/sleep"),
    pull("/developer/v1/activity/workout"),
    pull("/developer/v1/cycle"),
  ]);

  const rows: any[] = [];
  for (const r of recovery) {
    rows.push({
      user_id: userId,
      provider: "whoop",
      signal_type: "recovery",
      external_id: String(r.cycle_id ?? r.id),
      recorded_at: r.created_at || r.updated_at || new Date().toISOString(),
      value: {
        score: r.score?.recovery_score ?? null,
        hrv_ms: r.score?.hrv_rmssd_milli ?? null,
        rhr: r.score?.resting_heart_rate ?? null,
      },
    });
  }
  for (const s of sleep) {
    rows.push({
      user_id: userId,
      provider: "whoop",
      signal_type: "sleep",
      external_id: String(s.id),
      recorded_at: s.start || s.created_at || new Date().toISOString(),
      value: {
        start: s.start,
        end: s.end,
        duration_minutes:
          s.score?.stage_summary?.total_in_bed_time_milli != null
            ? Math.round(s.score.stage_summary.total_in_bed_time_milli / 60000)
            : null,
        efficiency: s.score?.sleep_efficiency_percentage ?? null,
        performance: s.score?.sleep_performance_percentage ?? null,
      },
    });
  }
  for (const w of workout) {
    rows.push({
      user_id: userId,
      provider: "whoop",
      signal_type: "workout",
      external_id: String(w.id),
      recorded_at: w.start || w.created_at || new Date().toISOString(),
      value: {
        start: w.start,
        end: w.end,
        sport_id: w.sport_id ?? null,
        strain: w.score?.strain ?? null,
        avg_hr: w.score?.average_heart_rate ?? null,
        max_hr: w.score?.max_heart_rate ?? null,
        kilojoule: w.score?.kilojoule ?? null,
      },
    });
  }
  for (const c of cycles) {
    rows.push({
      user_id: userId,
      provider: "whoop",
      signal_type: "cycle",
      external_id: String(c.id),
      recorded_at: c.start || c.created_at || new Date().toISOString(),
      value: {
        start: c.start,
        end: c.end,
        strain: c.score?.strain ?? null,
        avg_hr: c.score?.average_heart_rate ?? null,
        max_hr: c.score?.max_heart_rate ?? null,
      },
    });
  }

  if (rows.length === 0) return { count: 0 };
  const { error } = await service
    .from("health_signals")
    .upsert(rows, { onConflict: "user_id,provider,signal_type,external_id" });
  if (error) throw error;
  return { count: rows.length };
}

async function syncOura(
  service: SupabaseClient,
  userId: string,
  conn: any
): Promise<{ count: number }> {
  const accessToken = await ensureFreshToken(service, userId, conn);
  const today = new Date();
  const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  async function pull(path: string) {
    const url = `https://api.ouraring.com${path}?start_date=${startDate}&end_date=${endDate}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`oura ${path} failed: ${await res.text()}`);
    const data = await res.json();
    return (data.data || []) as any[];
  }

  const [sleep, readiness, activity, workout] = await Promise.all([
    pull("/v2/usercollection/sleep"),
    pull("/v2/usercollection/daily_readiness"),
    pull("/v2/usercollection/daily_activity"),
    pull("/v2/usercollection/workout"),
  ]);

  const rows: any[] = [];
  for (const s of sleep) {
    rows.push({
      user_id: userId,
      provider: "oura",
      signal_type: "sleep",
      external_id: String(s.id),
      recorded_at: s.bedtime_start || s.day || new Date().toISOString(),
      value: {
        day: s.day,
        bedtime_start: s.bedtime_start,
        bedtime_end: s.bedtime_end,
        total_sleep_minutes: s.total_sleep_duration ? Math.round(s.total_sleep_duration / 60) : null,
        efficiency: s.efficiency ?? null,
        deep_minutes: s.deep_sleep_duration ? Math.round(s.deep_sleep_duration / 60) : null,
        rem_minutes: s.rem_sleep_duration ? Math.round(s.rem_sleep_duration / 60) : null,
        avg_hrv: s.average_hrv ?? null,
        lowest_hr: s.lowest_heart_rate ?? null,
      },
    });
  }
  for (const r of readiness) {
    rows.push({
      user_id: userId,
      provider: "oura",
      signal_type: "readiness",
      external_id: String(r.id),
      recorded_at: r.timestamp || `${r.day}T00:00:00Z`,
      value: { day: r.day, score: r.score ?? null, contributors: r.contributors ?? null },
    });
  }
  for (const a of activity) {
    rows.push({
      user_id: userId,
      provider: "oura",
      signal_type: "activity",
      external_id: String(a.id),
      recorded_at: a.timestamp || `${a.day}T00:00:00Z`,
      value: {
        day: a.day,
        steps: a.steps ?? null,
        active_calories: a.active_calories ?? null,
        total_calories: a.total_calories ?? null,
        score: a.score ?? null,
      },
    });
  }
  for (const w of workout) {
    rows.push({
      user_id: userId,
      provider: "oura",
      signal_type: "workout",
      external_id: String(w.id),
      recorded_at: w.start_datetime || new Date().toISOString(),
      value: {
        activity: w.activity,
        intensity: w.intensity,
        start: w.start_datetime,
        end: w.end_datetime,
        calories: w.calories ?? null,
        distance: w.distance ?? null,
      },
    });
  }

  if (rows.length === 0) return { count: 0 };
  const { error } = await service
    .from("health_signals")
    .upsert(rows, { onConflict: "user_id,provider,signal_type,external_id" });
  if (error) throw error;
  return { count: rows.length };
}

async function syncStrava(
  service: SupabaseClient,
  userId: string,
  conn: any
): Promise<{ count: number }> {
  const accessToken = await ensureFreshToken(service, userId, conn);
  const after = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`strava activities failed: ${await res.text()}`);
  const activities = (await res.json()) as any[];
  if (!Array.isArray(activities) || activities.length === 0) return { count: 0 };

  const rows = activities.map((a) => ({
    user_id: userId,
    provider: "strava",
    signal_type: "workout",
    external_id: String(a.id),
    recorded_at: a.start_date || new Date().toISOString(),
    value: {
      name: a.name,
      type: a.type,
      sport_type: a.sport_type,
      distance_m: a.distance,
      moving_time_s: a.moving_time,
      elapsed_time_s: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
      avg_hr: a.average_heartrate ?? null,
      max_hr: a.max_heartrate ?? null,
      avg_speed: a.average_speed ?? null,
      calories: a.calories ?? null,
    },
  }));

  const { error } = await service
    .from("health_signals")
    .upsert(rows, { onConflict: "user_id,provider,signal_type,external_id" });
  if (error) throw error;
  return { count: rows.length };
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    let { provider, user_id } = body as { provider: string; user_id?: string };

    if (!user_id) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No auth header");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      user_id = user.id;
    }

    const { data: conn, error: connErr } = await service
      .from("user_connections")
      .select("*")
      .eq("user_id", user_id)
      .eq("provider", provider)
      .eq("status", "active")
      .maybeSingle();
    if (connErr) throw connErr;
    if (!conn) throw new Error("no active connection");

    let result: { count: number };
    try {
      switch (provider) {
        case "google_calendar":
          result = await syncGoogleCalendar(service, user_id, conn);
          break;
        case "whoop":
          result = await syncWhoop(service, user_id, conn);
          break;
        case "oura":
          result = await syncOura(service, user_id, conn);
          break;
        case "strava":
          result = await syncStrava(service, user_id, conn);
          break;
        default:
          throw new Error(`sync not implemented for ${provider}`);
      }

      await service
        .from("user_connections")
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq("user_id", user_id)
        .eq("provider", provider);

      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (syncErr: any) {
      await service
        .from("user_connections")
        .update({ last_sync_error: syncErr.message?.slice(0, 500) || "unknown error" })
        .eq("user_id", user_id)
        .eq("provider", provider);
      throw syncErr;
    }
  } catch (e: any) {
    console.error("sync-provider error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
