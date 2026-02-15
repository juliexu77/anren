import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Get the provider token from the session
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (!providerToken) {
      return new Response(
        JSON.stringify({ error: "No Google token found. Please sign in again with Google." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
      const timeMax = url.searchParams.get("timeMax") || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
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
