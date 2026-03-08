import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * send-weekly-synthesis
 *
 * Called by pg_cron every Sunday at 18:00 UTC (adjusts per user timezone).
 * 1. Finds all users with daily brief enabled
 * 2. Fetches their active cards
 * 3. Uses AI to categorize into domains, generate narrative, identify stale items
 * 4. Stores synthesis and sends push notification
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // For manual trigger, allow specific user_id
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id || null;
    } catch { /* no body = cron trigger */ }

    // Get users — either specific or all with daily brief enabled
    let users: any[];
    if (targetUserId) {
      users = [{ user_id: targetUserId }];
    } else {
      const { data, error } = await supabase
        .from("daily_brief_settings")
        .select("user_id")
        .eq("enabled", true);
      if (error) throw error;
      users = data || [];
    }

    // Week boundaries (last 7 days)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    let processed = 0;

    for (const u of users) {
      try {
        // Check if synthesis already exists for this week
        const { data: existing } = await supabase
          .from("weekly_syntheses")
          .select("id")
          .eq("user_id", u.user_id)
          .eq("week_start", weekStartDate)
          .maybeSingle();

        if (existing && !targetUserId) continue; // skip if already generated (unless manual)

        // Fetch all active + recently completed cards
        const { data: cards, error: cardsErr } = await supabase
          .from("cards")
          .select("id, title, body, routed_type, status, created_at, updated_at, due_at")
          .eq("user_id", u.user_id)
          .or(`status.eq.active,and(status.eq.complete,updated_at.gte.${weekStart.toISOString()})`)
          .order("created_at", { ascending: false })
          .limit(100);

        if (cardsErr) {
          console.error(`Error fetching cards for ${u.user_id}:`, cardsErr);
          continue;
        }

        if (!cards || cards.length === 0) continue;

        // Identify stale items (active and >7 days old, not updated recently)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const staleCards = cards.filter((c: any) => {
          if (c.status !== "active") return false;
          const created = new Date(c.created_at);
          const updated = new Date(c.updated_at);
          return created < sevenDaysAgo && updated < sevenDaysAgo;
        });

        // Build prompt for AI
        const cardSummaries = cards
          .filter((c: any) => c.body !== "@@PARSING@@" && c.body !== "@@PARSE_FAILED@@")
          .map((c: any) => `- "${c.title}" (${c.routed_type || "uncategorized"}, ${c.status}, created ${c.created_at.split("T")[0]})`)
          .join("\n");

        const staleList = staleCards
          .map((c: any) => `- "${c.title}" (sitting since ${c.created_at.split("T")[0]})`)
          .join("\n");

        const prompt = `You are Anren, a warm and thoughtful personal organizer. Analyze this person's items from the past week and create a weekly mental load synthesis.

ITEMS (${cards.length} total):
${cardSummaries}

STALE ITEMS (untouched for 7+ days):
${staleList || "None"}

COMPLETED THIS WEEK: ${cards.filter((c: any) => c.status === "complete").length}
STILL ACTIVE: ${cards.filter((c: any) => c.status === "active").length}

Instructions:
1. Categorize every item into life domains (e.g., Home, Work, Kids, Health, Finance, Social, Admin, Personal). Return percentage breakdown.
2. Write a warm, concise narrative (3-4 sentences max) that:
   - Notes where most mental load is concentrated
   - Celebrates anything completed
   - Gently mentions stale items if any exist, suggesting "What's my next step?" to help move them forward
3. Keep the tone supportive, not judgmental. Like a kind friend checking in.

Return ONLY valid JSON in this exact format:
{
  "narrative": "Your warm narrative here...",
  "domains": [
    {"name": "Home", "percentage": 35, "count": 4},
    {"name": "Work", "percentage": 25, "count": 3}
  ],
  "stale_nudges": [
    {"title": "Item title", "days_old": 12, "nudge": "A gentle one-liner about this item"}
  ]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${u.user_id}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const raw = aiData.choices?.[0]?.message?.content || "";

        // Extract JSON from response
        let parsed: any;
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch {
          console.error(`Failed to parse AI response for ${u.user_id}:`, raw.substring(0, 200));
          continue;
        }

        // Upsert synthesis
        await supabase.from("weekly_syntheses").upsert(
          {
            user_id: u.user_id,
            week_start: weekStartDate,
            narrative: parsed.narrative || "",
            domains: parsed.domains || [],
            stale_items: parsed.stale_nudges || [],
            total_cards_analyzed: cards.length,
            dismissed: false,
          },
          { onConflict: "user_id,week_start" }
        );

        // Send push notification
        const { data: tokens } = await supabase
          .from("device_tokens")
          .select("token")
          .eq("user_id", u.user_id);

        if (tokens && tokens.length > 0) {
          const apnsKeyBase64 = Deno.env.get("APNS_KEY_BASE64");
          const apnsKeyId = Deno.env.get("APNS_KEY_ID");
          const apnsTeamId = Deno.env.get("APNS_TEAM_ID");

          if (apnsKeyBase64 && apnsKeyId && apnsTeamId) {
            const pushBody = `${parsed.domains?.[0]?.name || "Life"} (${parsed.domains?.[0]?.percentage || 0}%) is where most of your energy went. Tap to see your full week.`;
            for (const t of tokens) {
              await sendAPNS({
                token: t.token,
                title: "Your week in review",
                body: pushBody,
                apnsKeyBase64,
                apnsKeyId,
                apnsTeamId,
                bundleId: "com.anrenapp.anren",
              });
            }
          }
        }

        processed++;
      } catch (e) {
        console.error(`Error processing user ${u.user_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ processed, total: users.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-weekly-synthesis error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendAPNS(opts: {
  token: string;
  title: string;
  body: string;
  apnsKeyBase64: string;
  apnsKeyId: string;
  apnsTeamId: string;
  bundleId: string;
}) {
  const jwt = await createAPNSJWT(opts.apnsKeyBase64, opts.apnsKeyId, opts.apnsTeamId);

  const payload = {
    aps: {
      alert: { title: opts.title, body: opts.body },
      sound: "default",
      "thread-id": "weekly-synthesis",
    },
  };

  const url = `https://api.push.apple.com/3/device/${opts.token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": opts.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "5",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`APNs error for token ${opts.token.substring(0, 8)}...:`, res.status, errText);
  }
}

async function createAPNSJWT(keyBase64: string, keyId: string, teamId: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "ES256", kid: keyId }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const now = Math.floor(Date.now() / 1000);
  const claims = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const signingInput = `${header}.${claims}`;
  const keyDer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyDer, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, cryptoKey, new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  return `${signingInput}.${sigB64}`;
}
