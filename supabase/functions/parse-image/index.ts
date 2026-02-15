import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const workstreams = [
  "finance", "childcare", "extracurriculars", "doctor",
  "house-maintenance", "home-organization", "household-inventory",
  "kids-clothes", "food", "laundry"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Extract mime type and base64 data
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

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
            name: "extract_card_info",
            description: "Extract structured information from an image for a household note card",
            input_schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short descriptive title (max 60 chars)" },
                body: { type: "string", description: "Detailed extracted information" },
                category: { type: "string", enum: workstreams, description: "Best matching workstream" }
              },
              required: ["title", "body", "category"]
            }
          }
        ],
        tool_choice: { type: "tool", name: "extract_card_info" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data,
                }
              },
              {
                type: "text",
                text: `Analyze this image and extract useful information. This could be a receipt, screenshot, school notice, medical form, recipe, shopping list, calendar event, to-do list, or anything related to household management. Extract a short title, detailed body, and the best matching workstream from: ${workstreams.join(", ")}. Be concise but capture all important details. IMPORTANT: Always include any dates, deadlines, due dates, appointment times, or event dates found in the image — put them prominently at the start of the body text.`
              }
            ]
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

    return new Response(JSON.stringify(toolUse.input), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
