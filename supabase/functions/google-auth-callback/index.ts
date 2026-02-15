import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "get-auth-url") {
      // Generate the Google OAuth URL for Calendar consent
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!clientId) throw new Error("Google OAuth not configured");

      const { redirectUri } = await req.json();

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar",
        access_type: "offline",
        prompt: "consent",
        state: user.id,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange-code") {
      // Exchange the authorization code for tokens
      const { code, redirectUri } = await req.json();

      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Token exchange failed:", errText);
        throw new Error("Failed to exchange authorization code");
      }

      const tokenData = await tokenRes.json();
      console.log("Token exchange success, has refresh_token:", !!tokenData.refresh_token);

      // Store tokens in profiles using service role
      const serviceClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({
          google_access_token: tokenData.access_token,
          google_refresh_token: tokenData.refresh_token || null,
          google_token_expires_at: new Date(
            Date.now() + (tokenData.expires_in || 3600) * 1000
          ).toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to save tokens:", updateError);
        throw new Error("Failed to save Google tokens");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has valid Google Calendar tokens
    if (action === "check-status") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_access_token, google_refresh_token, google_token_expires_at")
        .eq("user_id", user.id)
        .single();

      const hasTokens = !!(profile?.google_access_token);
      return new Response(JSON.stringify({ connected: hasTokens }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    console.error("google-auth-callback error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
