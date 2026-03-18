import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { calendarSummary } = await req.json().catch(() => ({}));

    // Fetch active cards
    const { data: cards } = await supabase
      .from("cards")
      .select("title, body, routed_type, due_at, created_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("body", "@@PARSING@@")
      .neq("body", "@@PARSE_FAILED@@")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ plan: null, message: "Nothing on your plate today." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the AI prompt
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

    const cardList = cards.map((c: any, i: number) => {
      const due = c.due_at ? `(due: ${new Date(c.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : "";
      const type = c.routed_type ? `[${c.routed_type}]` : "";
      return `${i + 1}. ${c.title || c.body?.substring(0, 80)} ${type} ${due}`.trim();
    }).join("\n");

    const calSection = calendarSummary
      ? `\nCalendar for today:\n${calendarSummary}\n`
      : "";

    const prompt = `You are Anren, a calm and trusted personal assistant. Today is ${dayName}, ${dateStr}.

Here is everything the user is currently holding:
${cardList}
${calSection}
Create a short "Run My Day" plan — 3 to 5 lines maximum. Each line is one action or awareness item for the day.

Rules:
- Prioritize by urgency: approaching deadlines first, then time-sensitive items, then everything else
- Group by time of day when it makes sense (this morning, this afternoon, before end of week)
- Tone: warm, confident, concise. Like a trusted friend who already figured it out for her.
- No bullet points or numbering. Use natural phrasing like "This morning:", "This afternoon:", "Before Friday:"
- Don't repeat exact card titles — rephrase naturally
- If a deadline is close, gently note it without alarm ("deadline is close", "don't let this slip")
- If there's nothing urgent, say something like "No rush today — just these when you're ready."
- NEVER use exclamation marks or productivity language
- Output ONLY the plan lines, one per line. No intro, no sign-off.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiRes.json();
    const planText = aiData.choices?.[0]?.message?.content?.trim();

    if (!planText) {
      throw new Error("Empty AI response");
    }

    // Parse into lines
    const planLines = planText
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 5);

    return new Response(
      JSON.stringify({ plan: planLines, generatedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("generate-daily-plan error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
