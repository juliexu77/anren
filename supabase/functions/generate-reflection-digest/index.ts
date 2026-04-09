import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { periodType } = await req.json();
    if (!["weekly", "monthly"].includes(periodType)) {
      return new Response(JSON.stringify({ error: "Invalid periodType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader?.replace("Bearer ", "") ?? "");
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const days = periodType === "weekly" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: reflections, error: fetchError } = await supabase
      .from("reflections")
      .select("*")
      .eq("user_id", user.id)
      .gte("reflection_date", since.toISOString().split("T")[0])
      .order("reflection_date", { ascending: true });

    if (fetchError) throw fetchError;

    if (!reflections || reflections.length === 0) {
      return new Response(JSON.stringify({ error: "No reflections found for this period" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compose a single document from all transcripts
    const document = reflections.map((r: any) =>
      `--- ${r.reflection_date} ---\nTexture: ${r.texture}\n${r.raw_transcript}`
    ).join("\n\n");

    const periodLabel = periodType === "weekly" ? "week" : "month";
    const sentenceCount = periodType === "weekly" ? "one honest sentence" : "3-4 sentences";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are reading all of a person's daily reflections from the past ${periodLabel} as a single document. Do not aggregate or average — read the whole document and surface what emerges from the whole.`,
          },
          {
            role: "user",
            content: `Here are all my reflections from the past ${periodLabel}:\n\n${document}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_digest",
              description: `Generate a ${periodLabel}ly texture digest`,
              parameters: {
                type: "object",
                properties: {
                  texture: {
                    type: "string",
                    description: `An overall texture phrase for the ${periodLabel}`,
                  },
                  what_created_it: {
                    type: "string",
                    description: "The specific conditions, people, activities that shaped the quality",
                  },
                  recurring_patterns: {
                    type: "string",
                    description: "Anything that appeared across multiple days as a consistent giver or drainer",
                  },
                  unresolved_threads: {
                    type: "string",
                    description: "Anything raised more than once that hasn't been addressed",
                  },
                  what_this_reveals: {
                    type: "string",
                    description: `${sentenceCount} about what this period seems to be pointing to about deeper needs or nature`,
                  },
                },
                required: ["texture", "what_created_it", "recurring_patterns", "unresolved_threads", "what_this_reveals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_digest" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No digest generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const digest = JSON.parse(toolCall.function.arguments);

    // Calculate period_start
    const now = new Date();
    let periodStart: string;
    if (periodType === "weekly") {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      periodStart = monday.toISOString().split("T")[0];
    } else {
      periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    // Insert into reflection_summaries
    const { data: summary, error: insertError } = await supabase
      .from("reflection_summaries")
      .insert({
        user_id: user.id,
        period_type: periodType,
        period_start: periodStart,
        ...digest,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-reflection-digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
