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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Detect mime type from data URL or default to jpeg
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a smart household assistant. Analyze the uploaded image and extract useful information. 
This could be a receipt, screenshot, school notice, medical form, recipe, shopping list, calendar event, to-do list, or anything related to household management.

Extract:
- A short descriptive title
- A detailed body with the key information (dates, amounts, items, instructions, etc.)
- The best matching workstream category from: ${workstreams.join(", ")}

Be concise but capture all important details. Format the body as clean readable text.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this image and extract the relevant information."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_card_info",
              description: "Extract structured information from an image for a household note card",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short descriptive title (max 60 chars)" },
                  body: { type: "string", description: "Detailed extracted information" },
                  category: { type: "string", enum: workstreams, description: "Best matching workstream" }
                },
                required: ["title", "body", "category"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_card_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
