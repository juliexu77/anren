import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, body, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const today = new Date().toISOString().split("T")[0];

    // Phase 1: AI reasoning about next step
    const reasoningResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a calm, knowledgeable thinking partner. Today is ${today}. The user has a note and wants to know the most useful next step. Think concretely — what would actually move this forward? If research would help (looking up a phone number, checking a price, finding a resource), include a search query. Be warm and specific, not generic.`,
          },
          {
            role: "user",
            content: `Title: ${title || "Untitled"}\nContent: ${body || "(empty)"}\nType: ${type || "unknown"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_next_step",
              description: "Return the suggested next step and optional search queries for grounding",
              parameters: {
                type: "object",
                properties: {
                  suggestion: { type: "string", description: "A warm, concrete next-step suggestion (2-4 sentences)" },
                  searchQueries: {
                    type: "array",
                    items: { type: "string" },
                    description: "0-2 web search queries that would make the suggestion more grounded with real info (prices, links, hours, etc). Leave empty if not needed.",
                  },
                },
                required: ["suggestion", "searchQueries"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_next_step" } },
      }),
    });

    if (!reasoningResponse.ok) {
      if (reasoningResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (reasoningResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await reasoningResponse.text();
      console.error("AI gateway error:", reasoningResponse.status, t);
      throw new Error(`AI gateway error: ${reasoningResponse.status}`);
    }

    const reasoningData = await reasoningResponse.json();
    const toolCall = reasoningData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);
    let { suggestion, searchQueries } = parsed;
    const sources: string[] = [];

    // Phase 2: If Perplexity is connected and there are search queries, do research
    if (PERPLEXITY_API_KEY && searchQueries && searchQueries.length > 0) {
      try {
        const searchResults: string[] = [];

        for (const query of searchQueries.slice(0, 2)) {
          const searchResponse = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                { role: "system", content: "Be precise and concise. Return factual information." },
                { role: "user", content: query },
              ],
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const content = searchData.choices?.[0]?.message?.content;
            if (content) searchResults.push(content);
            if (searchData.citations) {
              sources.push(...searchData.citations.slice(0, 3));
            }
          }
        }

        // Phase 2b: Synthesize research into final suggestion
        if (searchResults.length > 0) {
          const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  content: "You are a calm thinking partner. Combine the original suggestion with the research findings into a concise, actionable next step (3-5 sentences). Include specific details from the research (prices, links, hours, names). Be warm and helpful.",
                },
                {
                  role: "user",
                  content: `Original suggestion: ${suggestion}\n\nResearch findings:\n${searchResults.join("\n\n")}`,
                },
              ],
            }),
          });

          if (synthesisResponse.ok) {
            const synthesisData = await synthesisResponse.json();
            const enriched = synthesisData.choices?.[0]?.message?.content;
            if (enriched) suggestion = enriched;
          }
        }
      } catch (e) {
        console.error("Perplexity research error (continuing with AI-only suggestion):", e);
      }
    }

    return new Response(JSON.stringify({ suggestion, sources: sources.length > 0 ? sources : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("research-next-step error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
