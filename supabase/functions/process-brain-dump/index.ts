import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are a gentle, precise assistant that helps people externalize their mental load.

You will receive a raw brain dump — a stream of consciousness from someone carrying too much in their head. It may be messy, fragmented, repetitive. That's OK.

Your job:
1. Extract every distinct actionable or notable item.
2. For each item, determine:
   - A short, clear title (5-10 words max)
   - Type: "task" (one-time action), "ongoing" (recurring responsibility), or "event" (time-bound, needs calendar)
   - Theme: one of "household", "school", "health", "admin", "travel", "social", "work", "finance", "family", "personal"
   - due_at: ONLY set this if the user explicitly mentioned a specific date or deadline (e.g. "by Friday", "March 10th", "next week"). Do NOT infer dates from words like "birthday", "anniversary", or seasonal references unless a specific date is stated. If no specific date/deadline is mentioned, set due_at to null. Today is ${today}.
3. Do NOT merge items. Keep them separate.
4. Do NOT add items that weren't mentioned.
5. Be warm but efficient. Titles should feel human, not corporate.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_items",
                description:
                  "Extract distinct items from a brain dump into structured format",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                            description: "Short human-readable title",
                          },
                          type: {
                            type: "string",
                            enum: ["task", "ongoing", "event"],
                            description: "task=one-time, ongoing=recurring, event=calendar-bound",
                          },
                          theme: {
                            type: "string",
                            enum: [
                              "household",
                              "school",
                              "health",
                              "admin",
                              "travel",
                              "social",
                              "work",
                              "finance",
                              "family",
                              "personal",
                            ],
                          },
                          due_at: {
                            type: "string",
                            description:
                              "ISO 8601 date/time if time-sensitive, or null",
                          },
                        },
                        required: ["title", "type", "theme"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["items"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_items" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output returned");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-brain-dump error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
