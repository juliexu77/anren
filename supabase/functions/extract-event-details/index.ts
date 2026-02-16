import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, body } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const noteText = [title, body].filter(Boolean).join("\n");
    if (!noteText.trim()) {
      return new Response(JSON.stringify({ error: "Empty note" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You extract calendar event details from a household note. Today is ${today}.

Given a note, extract:
- summary: A concise event title (max 8 words)
- description: A brief description of what the event is about (1-2 sentences)
- date: The date in YYYY-MM-DD format. If relative (e.g. "tomorrow", "next Tuesday"), resolve it relative to today.
- startTime: Start time in HH:MM 24h format. If not specified, guess a reasonable time or use "09:00".
- endTime: End time in HH:MM 24h format. If not specified, set it 1 hour after startTime.

If there are multiple dates/events in the note, pick the most prominent one.
Respond using the extract_event tool.`,
          },
          { role: "user", content: noteText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_event",
              description: "Extract calendar event details from a note",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Event title (max 8 words)" },
                  description: { type: "string", description: "Brief event description" },
                  date: { type: "string", description: "Date in YYYY-MM-DD format" },
                  startTime: { type: "string", description: "Start time in HH:MM 24h format" },
                  endTime: { type: "string", description: "End time in HH:MM 24h format" },
                },
                required: ["summary", "description", "date", "startTime", "endTime"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_event" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-event-details error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
