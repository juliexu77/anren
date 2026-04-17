import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const systemPrompt = `You are Anren, a gentle companion that helps people externalize everything on their mind — both the logistics and the emotional weight.

You will receive a single stream of consciousness. It will contain a mix of tasks, worries, feelings, logistics, and emotional processing. That's how real minds work. Your job is to receive ALL of it and sort it into two layers:

**Layer 1: Items** — Extract every distinct actionable or notable item.
For each item:
- A short, clear title (5-10 words max)
- Type: "task" (one-time action), "ongoing" (recurring responsibility), or "event" (time-bound)
- Theme: one of "household", "school", "health", "admin", "travel", "social", "work", "finance", "family", "personal"
- Do NOT assign a date or deadline to any item. The user will add those manually if they want them.

**Layer 2: Reflection** — Read the emotional texture woven through the stream.
If there is ANY emotional, energetic, or reflective content (tiredness, frustration, joy, overwhelm, gratitude, resentment, etc.), extract:
- texture: A 2-4 word qualitative phrase capturing the felt quality (e.g. "scattered but alive", "heavy and giving", "quiet depletion")
- texture_why: 2-3 sentences on what specifically created that texture
- what_this_reveals: One sentence going deeper — what this might point to about needs, patterns, or nature
- energy_givers: Specific things that gave life or expansion
- energy_drainers: Specific things that took energy or contracted
- unresolved_threads: Anything raised that feels incomplete or worth returning to
- summary: A brief 1-2 sentence summary of the emotional layer

If the stream is purely logistical with NO emotional content whatsoever, set reflection to null. But err on the side of finding the emotional layer — it's almost always there. "I'm so tired of being the one who handles everything" is not just a task context, it's a window into load and resentment.

Rules:
- Do NOT merge items. Keep them separate.
- Do NOT add items that weren't mentioned.
- Titles should feel human, not corporate.
- The interleaving of tasks and feelings IS the signal. Use it.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "process_stream",
              description: "Extract actionable items and emotional reflection from a stream of consciousness",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short human-readable title" },
                        type: { type: "string", enum: ["task", "ongoing", "event"] },
                        theme: {
                          type: "string",
                          enum: ["household", "school", "health", "admin", "travel", "social", "work", "finance", "family", "personal"],
                        },
                      },
                      required: ["title", "type", "theme"],
                      additionalProperties: false,
                    },
                  },
                  reflection: {
                    type: "object",
                    description: "Emotional/reflective layer. Null if purely logistical.",
                    properties: {
                      texture: { type: "string", description: "2-4 word qualitative phrase" },
                      texture_why: { type: "string", description: "What created this texture" },
                      what_this_reveals: { type: "string", description: "One level deeper insight" },
                      energy_givers: { type: "array", items: { type: "string" } },
                      energy_drainers: { type: "array", items: { type: "string" } },
                      unresolved_threads: { type: "array", items: { type: "string" } },
                      summary: { type: "string", description: "1-2 sentence summary" },
                    },
                    required: ["texture", "texture_why", "what_this_reveals", "energy_givers", "energy_drainers", "unresolved_threads", "summary"],
                    additionalProperties: false,
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_stream" } },
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
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output returned");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-stream error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
