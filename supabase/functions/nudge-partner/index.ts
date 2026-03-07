import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * nudge-partner — called weekly by pg_cron
 * Sends a push to household viewers: "Your partner is holding X things right now. Take a moment to notice."
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const apnsKeyBase64 = Deno.env.get("APNS_KEY_BASE64");
    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const bundleId = "com.anrenapp.anren";

    if (!apnsKeyBase64 || !apnsKeyId || !apnsTeamId) {
      return new Response(JSON.stringify({ error: "APNs not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all household members who are viewers
    const { data: members, error: membersErr } = await supabase
      .from("household_members")
      .select("user_id, households(owner_id)")
      .eq("role", "viewer");

    if (membersErr) throw membersErr;
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const member of members) {
      try {
        const ownerId = (member as any).households?.owner_id;
        if (!ownerId) continue;

        // Count owner's active cards
        const { count } = await supabase
          .from("cards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", ownerId)
          .eq("status", "active");

        const cardCount = count || 0;
        if (cardCount === 0) continue;

        // Get partner's device tokens
        const { data: tokens } = await supabase
          .from("device_tokens")
          .select("token")
          .eq("user_id", member.user_id);

        if (!tokens || tokens.length === 0) continue;

        const body = cardCount === 1
          ? "Your partner is holding 1 thing right now. Take a moment to notice."
          : `Your partner is holding ${cardCount} things right now. Take a moment to notice.`;

        const jwt = await createAPNSJWT(apnsKeyBase64, apnsKeyId, apnsTeamId);

        for (const t of tokens) {
          const payload = {
            aps: {
              alert: { title: "Anren", body },
              sound: "default",
              "thread-id": "partner-nudge",
            },
          };

          const url = `https://api.push.apple.com/3/device/${t.token}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              authorization: `bearer ${jwt}`,
              "apns-topic": bundleId,
              "apns-push-type": "alert",
              "apns-priority": "5",
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`APNs error:`, res.status, errText);
          }
        }
        sentCount++;
      } catch (e) {
        console.error(`Error nudging member ${member.user_id}:`, e);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("nudge-partner error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createAPNSJWT(keyBase64: string, keyId: string, teamId: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "ES256", kid: keyId }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const now = Math.floor(Date.now() / 1000);
  const claims = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const signingInput = `${header}.${claims}`;
  const keyDer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", keyDer, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, new TextEncoder().encode(signingInput));
  const sigBytes = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${signingInput}.${sigB64}`;
}
