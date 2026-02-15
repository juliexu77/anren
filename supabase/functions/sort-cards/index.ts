import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cards } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const workstreams = [
      "finance", "childcare", "extracurriculars", "doctor",
      "house-maintenance", "home-organization", "household-inventory",
      "kids-clothes", "food", "laundry"
    ];

    const cardSummaries = cards.map((c: any, i: number) => `${i}: "${c.title || ''}" - "${c.body || ''}"`).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        tools: [
          {
            name: "categorize_notes",
            description: "Assign each note to a workstream category",
            input_schema: {
              type: "object",
              properties: {
                assignments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number", description: "Index of the note" },
                      category: { type: "string", enum: workstreams, description: "The workstream category" }
                    },
                    required: ["index", "category"]
                  }
                }
              },
              required: ["assignments"]
            }
          }
        ],
        tool_choice: { type: "tool", name: "categorize_notes" },
        messages: [
          {
            role: "user",
            content: `Categorize these household notes into workstreams (${workstreams.join(", ")}):\n${cardSummaries}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const toolUse = data.content?.find((b: any) => b.type === "tool_use");
    if (!toolUse) throw new Error("No tool use in response");

    return new Response(JSON.stringify({ assignments: toolUse.input.assignments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sort-cards error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
