import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    if (!transcript?.trim()) {
      return new Response(JSON.stringify({ error: "No transcript provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are a reflective companion. A person has just spoken freely about how their day is going. Your job is to extract a structured reflection — not to advise, not to fix, but to mirror back what they shared with clarity and depth.

Do NOT create tasks or action items. This is purely reflective.

Guidelines for the texture field: Generate a 2–4 word qualitative phrase that captures the felt quality of this day — not a score, not a mood label, but a texture. Examples: "creative abundance," "quiet depletion," "scattered but alive," "heavy and giving." Generate this from what the person describes.`,
          },
          { role: "user", content: transcript },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_reflection",
              description: "Extract a structured reflection from a voice transcript",
              parameters: {
                type: "object",
                properties: {
                  texture: {
                    type: "string",
                    description: "A 2-4 word qualitative phrase capturing the felt quality of the day",
                  },
                  texture_why: {
                    type: "string",
                    description: "2-3 sentences on what specifically created that texture",
                  },
                  what_this_reveals: {
                    type: "string",
                    description: "One sentence going one level deeper — what this day's texture might point to about needs, patterns, or nature",
                  },
                  energy_givers: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific things mentioned that gave life or expansion",
                  },
                  energy_drainers: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific things mentioned that took energy or contracted the person",
                  },
                  unresolved_threads: {
                    type: "array",
                    items: { type: "string" },
                    description: "Anything raised that feels incomplete or worth returning to",
                  },
                  summary: {
                    type: "string",
                    description: "A brief 1-2 sentence summary of the reflection",
                  },
                },
                required: ["texture", "texture_why", "what_this_reveals", "energy_givers", "energy_drainers", "unresolved_threads", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_reflection" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No reflection extracted" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reflection = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(reflection), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-reflection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
