import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * send-daily-brief
 *
 * Called by pg_cron every 15 minutes.
 * 1. Finds users whose delivery_time matches the current 15-min slot (in their timezone)
 * 2. Fetches their Google Calendar events for today
 * 3. Builds a brief summary
 * 4. Sends APNs push notification to all their devices
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Current UTC time rounded to 15-min slot
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = Math.floor(now.getUTCMinutes() / 15) * 15;

    // Fetch all enabled brief settings
    const { data: allSettings, error: settingsErr } = await supabase
      .from("daily_brief_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsErr) throw settingsErr;
    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No users with brief enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter users whose local delivery time matches now
    const matchingUsers = allSettings.filter((s: any) => {
      try {
        // Convert current UTC time to user's timezone
        const userLocalTime = new Date(now.toLocaleString("en-US", { timeZone: s.timezone }));
        const localHour = userLocalTime.getHours();
        const localMinute = Math.floor(userLocalTime.getMinutes() / 15) * 15;

        const [deliveryH, deliveryM] = s.delivery_time.split(":").map(Number);
        const deliveryMinRounded = Math.floor(deliveryM / 15) * 15;

        return localHour === deliveryH && localMinute === deliveryMinRounded;
      } catch {
        return false;
      }
    });

    if (matchingUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No users due for brief right now" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const apnsKeyBase64 = Deno.env.get("APNS_KEY_BASE64");
    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const bundleId = "com.anrenapp.anren";

    for (const userSettings of matchingUsers) {
      try {
        // Check if already dismissed today
        const today = new Date().toISOString().split("T")[0];
        const { data: dismissal } = await supabase
          .from("daily_brief_dismissals")
          .select("id")
          .eq("user_id", userSettings.user_id)
          .eq("dismissed_date", today)
          .maybeSingle();

        // Don't send if already dismissed (they already saw it in-app)
        if (dismissal) continue;

        // Build brief text from calendar
        const briefText = await buildBriefForUser(supabase, userSettings.user_id);

        // Get device tokens
        const { data: tokens } = await supabase
          .from("device_tokens")
          .select("token")
          .eq("user_id", userSettings.user_id);

        if (!tokens || tokens.length === 0) continue;

        // Send push to each device
        if (apnsKeyBase64 && apnsKeyId && apnsTeamId) {
          for (const t of tokens) {
            await sendAPNS({
              token: t.token,
              title: "Your day",
              body: briefText,
              apnsKeyBase64,
              apnsKeyId,
              apnsTeamId,
              bundleId,
            });
          }
          sentCount++;
        } else {
          console.log(`[send-daily-brief] APNs not configured, skipping push for user ${userSettings.user_id}`);
          console.log(`Brief text: ${briefText}`);
        }
      } catch (e) {
        console.error(`Error sending brief for user ${userSettings.user_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, matched: matchingUsers.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-daily-brief error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Build a short brief string for a user from their Google Calendar
 */
async function buildBriefForUser(supabase: any, userId: string): Promise<string> {
  // Get profile for Google token
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("user_id", userId)
    .single();

  if (!profile?.google_access_token) {
    return "Connect your calendar to see today's brief.";
  }

  let accessToken = profile.google_access_token;

  // Check if token expired and refresh if needed
  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at).getTime()
    : 0;

  if (Date.now() > expiresAt - 5 * 60 * 1000 && profile.google_refresh_token) {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (clientId && clientSecret) {
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: profile.google_refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
          const expiresIn = tokenData.expires_in || 3600;

          await supabase
            .from("profiles")
            .update({
              google_access_token: accessToken,
              google_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            })
            .eq("user_id", userId);
        }
      } catch (e) {
        console.error("Token refresh failed in brief:", e);
      }
    }
  }

  // Fetch today's events
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(todayStart.toISOString())}&timeMax=${encodeURIComponent(todayEnd.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calRes.ok) {
      return "Couldn't load your calendar. The day is yours.";
    }

    const calData = await calRes.json();
    const events = calData.items || [];

    if (events.length === 0) {
      return "Nothing scheduled. The day is yours.";
    }

    // Build concise brief
    const lines: string[] = [];
    const timed = events.filter((e: any) => e.start?.dateTime);
    const allDay = events.filter((e: any) => e.start?.date && !e.start?.dateTime);

    if (allDay.length > 0) {
      allDay.slice(0, 2).forEach((e: any) => {
        lines.push(`All day — ${e.summary || "Event"}`);
      });
    }

    timed.slice(0, 4).forEach((e: any) => {
      const time = new Date(e.start.dateTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      lines.push(`${time} — ${e.summary || "Event"}`);
    });

    const remaining = events.length - lines.length;
    if (remaining > 0) {
      lines.push(`and ${remaining} more`);
    }

    return lines.join("\n");
  } catch (e) {
    console.error("Calendar fetch in brief:", e);
    return "Couldn't load your calendar. The day is yours.";
  }
}

/**
 * Send APNs push notification using HTTP/2 via JWT auth
 */
async function sendAPNS(opts: {
  token: string;
  title: string;
  body: string;
  apnsKeyBase64: string;
  apnsKeyId: string;
  apnsTeamId: string;
  bundleId: string;
}) {
  // For APNs HTTP/2 push, we need to create a JWT and send to Apple's servers.
  // Deno supports HTTP/2 natively.
  
  const jwt = await createAPNSJWT(opts.apnsKeyBase64, opts.apnsKeyId, opts.apnsTeamId);

  const payload = {
    aps: {
      alert: {
        title: opts.title,
        body: opts.body,
      },
      sound: "default",
      "thread-id": "daily-brief",
    },
  };

  // Use production APNs endpoint
  const url = `https://api.push.apple.com/3/device/${opts.token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": `bearer ${jwt}`,
      "apns-topic": opts.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "5", // low priority for scheduled notifications
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`APNs error for token ${opts.token.substring(0, 8)}...:`, res.status, errText);
  }
}

/**
 * Create a JWT for APNs authentication
 */
async function createAPNSJWT(
  keyBase64: string,
  keyId: string,
  teamId: string
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "ES256", kid: keyId }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const now = Math.floor(Date.now() / 1000);
  const claims = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const signingInput = `${header}.${claims}`;

  // Decode base64 key
  const keyDer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyDer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format for JWT
  const sigBytes = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${signingInput}.${sigB64}`;
}
