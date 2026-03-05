import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const categories = [
  "finance", "childcare", "extracurriculars", "doctor",
  "house-maintenance", "home-organization", "household-inventory",
  "kids-clothes", "food", "laundry",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioBase64, mimeType, extractItems } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Choose tool based on whether we want multi-item extraction
    const tools = extractItems
      ? [
          {
            type: "function",
            function: {
              name: "process_voice_items",
              description: "Extract multiple actionable items from a voice note",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short action item (max 8 words), cleaned up and clear" },
                        body: { type: "string", description: "The full detail of this item" },
                        category: { type: "string", enum: categories },
                      },
                      required: ["title", "body", "category"],
                    },
                    description: "Each distinct thing the person mentioned, as a separate item",
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ]
      : [
          {
            type: "function",
            function: {
              name: "process_voice_note",
              description: "Process a transcribed voice note into a structured card",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short title (max 6 words)" },
                  summary: { type: "string", description: "Ultra-short summary (max 50 chars)" },
                  body: { type: "string", description: "Clean formatted note body from the transcription" },
                  category: { type: "string", enum: categories },
                },
                required: ["title", "summary", "body", "category"],
                additionalProperties: false,
              },
            },
          },
        ];

    const toolChoice = extractItems
      ? { type: "function", function: { name: "process_voice_items" } }
      : { type: "function", function: { name: "process_voice_note" } };

    const systemPrompt = extractItems
      ? `You are a household assistant. You will receive audio of someone listing things on their mind — tasks, appointments, reminders, anything.

Your job:
1. Transcribe the audio accurately
2. Split into separate actionable items (each thing they mentioned becomes its own item)
3. Clean up each item into a short, clear title and body
4. Categorize each into one of: ${categories.join(", ")}

Use the process_voice_items tool to return ALL items as an array.`
      : `You are a household note assistant. You will receive an audio recording of someone dictating a note about household tasks, appointments, or to-dos.

Your job:
1. Transcribe the audio accurately
2. Create a short title (max 6 words)
3. Write an ultra-short summary (max 50 chars) capturing key details — dates, deadlines, amounts, URLs
4. Categorize into one of: ${categories.join(", ")}
5. Clean up the transcription into a well-formatted note body (fix grammar, remove filler words, organize into clear text)

Use the process_voice_note tool to return your results.`;

    // Use Gemini with audio input
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: mimeType?.includes("mp4") || mimeType?.includes("m4a") ? "mp3" : "wav",
                },
              },
              {
                type: "text",
                text: "Please transcribe and process this voice note.",
              },
            ],
          },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-voice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
