import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getValidGoogleToken(supabase: any, userId: string): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    throw new Error("No Google tokens found. Please sign out and sign in again with Google.");
  }

  const { google_access_token, google_refresh_token, google_token_expires_at } = profile;

  if (!google_access_token) {
    throw new Error("No Google access token. Please sign out and sign in again.");
  }

  const expiresAt = google_token_expires_at ? new Date(google_token_expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (!isExpired) {
    return google_access_token;
  }

  if (!google_refresh_token) {
    throw new Error("Token expired and no refresh token available. Please sign out and sign in again.");
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Token refresh failed:", errText);
    throw new Error("Failed to refresh Google token. Please sign out and sign in again.");
  }

  const tokenData = await tokenRes.json();
  const newAccessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await serviceClient
    .from("profiles")
    .update({
      google_access_token: newAccessToken,
      google_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    })
    .eq("user_id", userId);

  return newAccessToken;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const providerToken = await getValidGoogleToken(supabase, user.id);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
      const timeMax = url.searchParams.get("timeMax") || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const calendarId = url.searchParams.get("calendarId") || "primary";

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      );

      if (!calRes.ok) {
        const errText = await calRes.text();
        console.error("Calendar API error:", calRes.status, errText);
        throw new Error(`Calendar API error: ${calRes.status}`);
      }

      const calData = await calRes.json();
      return new Response(JSON.stringify({ events: calData.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "calendarList") {
      const calRes = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
        { headers: { Authorization: `Bearer ${providerToken}` } }
      );

      if (!calRes.ok) {
        const errText = await calRes.text();
        throw new Error(`CalendarList error: ${calRes.status} ${errText}`);
      }

      const data = await calRes.json();
      const calendars = (data.items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary || c.id,
        primary: !!c.primary,
        backgroundColor: c.backgroundColor,
      }));

      return new Response(JSON.stringify({ calendars }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "birthdays") {
      // Query the Google Contacts birthday calendar for the next year
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

      // Google's built-in contacts birthday calendar
      const calendarId = encodeURIComponent("addressbook#contacts@group.v.calendar.google.com");

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      );

      if (!calRes.ok) {
        // Birthday calendar may not exist or be accessible — return empty
        console.error("Birthday calendar error:", calRes.status, await calRes.text());
        return new Response(JSON.stringify({ birthdays: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const calData = await calRes.json();
      const birthdays = (calData.items || []).map((item: any) => ({
        name: (item.summary || "").replace("'s birthday", "").replace("'s Birthday", "").trim(),
        date: item.start?.date || item.start?.dateTime || "",
        summary: item.summary || "",
      }));

      return new Response(JSON.stringify({ birthdays }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const body = await req.json();
      const calRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body.event),
        }
      );

      if (!calRes.ok) {
        const errText = await calRes.text();
        throw new Error(`Create event error: ${calRes.status} ${errText}`);
      }

      const created = await calRes.json();
      return new Response(JSON.stringify({ event: created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const body = await req.json();
      const eventId = url.searchParams.get("eventId");
      if (!eventId) throw new Error("eventId required");

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${providerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body.event),
        }
      );

      if (!calRes.ok) throw new Error(`Update error: ${calRes.status}`);
      const updated = await calRes.json();
      return new Response(JSON.stringify({ event: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const eventId = url.searchParams.get("eventId");
      if (!eventId) throw new Error("eventId required");

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${providerToken}` },
        }
      );

      if (!calRes.ok) throw new Error(`Delete error: ${calRes.status}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e: any) {
    console.error("google-calendar error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
