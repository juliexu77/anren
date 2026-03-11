import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * send-weekly-synthesis
 *
 * Called by pg_cron every Sunday at 18:00 UTC.
 * 1. Finds all users with daily brief enabled
 * 2. Fetches their active cards
 * 3. Uses AI to categorize into domains, generate narrative, identify stale items
 * 4. Stores synthesis and sends email via SendGrid
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not configured");

    // For manual trigger, allow specific user_id
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id || null;
    } catch { /* no body = cron trigger */ }

    // Get users — either specific or all with daily brief enabled
    let users: any[];
    if (targetUserId) {
      users = [{ user_id: targetUserId }];
    } else {
      const { data, error } = await supabase
        .from("daily_brief_settings")
        .select("user_id")
        .eq("enabled", true);
      if (error) throw error;
      users = data || [];
    }

    // Week boundaries (last 7 days)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split("T")[0];

    let processed = 0;

    for (const u of users) {
      try {
        // Check if synthesis already exists for this week
        const { data: existing } = await supabase
          .from("weekly_syntheses")
          .select("id")
          .eq("user_id", u.user_id)
          .eq("week_start", weekStartDate)
          .maybeSingle();

        if (existing && !targetUserId) continue;

        // Fetch user email from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", u.user_id)
          .single();

        if (!profile?.email) {
          console.error(`No email for user ${u.user_id}, skipping`);
          continue;
        }

        // Fetch all active + recently completed cards
        const { data: cards, error: cardsErr } = await supabase
          .from("cards")
          .select("id, title, body, routed_type, status, created_at, updated_at, due_at")
          .eq("user_id", u.user_id)
          .or(`status.eq.active,and(status.eq.complete,updated_at.gte.${weekStart.toISOString()})`)
          .order("created_at", { ascending: false })
          .limit(100);

        if (cardsErr) {
          console.error(`Error fetching cards for ${u.user_id}:`, cardsErr);
          continue;
        }

        if (!cards || cards.length === 0) continue;

        // Identify stale items (active and >7 days old, not updated recently)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const staleCards = cards.filter((c: any) => {
          if (c.status !== "active") return false;
          const created = new Date(c.created_at);
          const updated = new Date(c.updated_at);
          return created < sevenDaysAgo && updated < sevenDaysAgo;
        });

        // Build prompt for AI
        const cardSummaries = cards
          .filter((c: any) => c.body !== "@@PARSING@@" && c.body !== "@@PARSE_FAILED@@")
          .map((c: any) => `- "${c.title}" (${c.routed_type || "uncategorized"}, ${c.status}, created ${c.created_at.split("T")[0]})`)
          .join("\n");

        const staleList = staleCards
          .map((c: any) => `- "${c.title}" (sitting since ${c.created_at.split("T")[0]})`)
          .join("\n");

        const prompt = `You are Anren, a warm and thoughtful personal organizer. Analyze this person's items from the past week and create a weekly mental load synthesis.

ITEMS (${cards.length} total):
${cardSummaries}

STALE ITEMS (untouched for 7+ days):
${staleList || "None"}

COMPLETED THIS WEEK: ${cards.filter((c: any) => c.status === "complete").length}
STILL ACTIVE: ${cards.filter((c: any) => c.status === "active").length}

Instructions:
1. Categorize every item into life domains (e.g., Home, Work, Kids, Health, Finance, Social, Admin, Personal). Return percentage breakdown.
2. Write a warm, concise narrative (3-4 sentences max) that:
   - Notes where most mental load is concentrated
   - Celebrates anything completed
   - Gently mentions stale items if any exist, suggesting "What's my next step?" to help move them forward
3. Keep the tone supportive, not judgmental. Like a kind friend checking in.

Return ONLY valid JSON in this exact format:
{
  "narrative": "Your warm narrative here...",
  "domains": [
    {"name": "Home", "percentage": 35, "count": 4},
    {"name": "Work", "percentage": 25, "count": 3}
  ],
  "stale_nudges": [
    {"title": "Item title", "days_old": 12, "nudge": "A gentle one-liner about this item"}
  ]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${u.user_id}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const raw = aiData.choices?.[0]?.message?.content || "";

        // Extract JSON from response
        let parsed: any;
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch {
          console.error(`Failed to parse AI response for ${u.user_id}:`, raw.substring(0, 200));
          continue;
        }

        // Upsert synthesis
        await supabase.from("weekly_syntheses").upsert(
          {
            user_id: u.user_id,
            week_start: weekStartDate,
            narrative: parsed.narrative || "",
            domains: parsed.domains || [],
            stale_items: parsed.stale_nudges || [],
            total_cards_analyzed: cards.length,
            dismissed: false,
          },
          { onConflict: "user_id,week_start" }
        );

        // Send email via SendGrid
        const html = buildEmailHtml(
          profile.display_name || "there",
          parsed.narrative || "",
          parsed.domains || [],
          parsed.stale_nudges || [],
          cards.length,
          cards.filter((c: any) => c.status === "complete").length
        );

        const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: profile.email, name: profile.display_name || "" }] }],
            from: { email: "hello@anren.app", name: "Anren" },
            subject: "Your week in review ✨",
            content: [{ type: "text/html", value: html }],
          }),
        });

        if (!sgRes.ok) {
          const errText = await sgRes.text();
          console.error(`SendGrid error for ${u.user_id}:`, sgRes.status, errText);
        } else {
          console.log(`Weekly synthesis email sent to ${profile.email}`);
        }

        processed++;
      } catch (e) {
        console.error(`Error processing user ${u.user_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ processed, total: users.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-weekly-synthesis error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildEmailHtml(
  name: string,
  narrative: string,
  domains: Array<{ name: string; percentage: number; count: number }>,
  staleNudges: Array<{ title: string; days_old: number; nudge: string }>,
  totalCards: number,
  completedCount: number
): string {
  const domainColors: Record<string, string> = {
    Home: "#E8927C",
    Work: "#7C9EE8",
    Kids: "#E8C87C",
    Health: "#7CE8A3",
    Finance: "#C87CE8",
    Social: "#E87CA3",
    Admin: "#A3A3A3",
    Personal: "#7CE8E8",
  };

  const domainBars = domains
    .sort((a, b) => b.percentage - a.percentage)
    .map((d) => {
      const color = domainColors[d.name] || "#A3A3A3";
      return `
        <tr>
          <td style="padding: 6px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width: 90px; font-family: Georgia, serif; font-size: 14px; color: #5C4A3A;">${d.name}</td>
                <td style="padding: 0 12px;">
                  <div style="background: #F5F0EB; border-radius: 12px; height: 20px; overflow: hidden;">
                    <div style="background: ${color}; width: ${Math.max(d.percentage, 4)}%; height: 100%; border-radius: 12px;"></div>
                  </div>
                </td>
                <td style="width: 50px; font-family: Georgia, serif; font-size: 13px; color: #8B7A6B; text-align: right;">${d.percentage}%</td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const staleSection =
    staleNudges.length > 0
      ? `
        <tr>
          <td style="padding: 28px 32px 20px;">
            <p style="font-family: Georgia, serif; font-size: 13px; color: #8B7A6B; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px;">Gentle nudges</p>
            ${staleNudges
              .map(
                (s) => `
              <div style="background: #FDF8F4; border-left: 3px solid #E8927C; padding: 12px 16px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
                <p style="font-family: Georgia, serif; font-size: 14px; color: #5C4A3A; margin: 0 0 4px; font-weight: 600;">${s.title}</p>
                <p style="font-family: Georgia, serif; font-size: 13px; color: #8B7A6B; margin: 0;">${s.nudge}</p>
              </div>`
              )
              .join("")}
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #ffffff; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background: #FDFBF8; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(92,74,58,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #8B7A6B 100%); padding: 32px; text-align: center;">
              <p style="font-family: Georgia, serif; font-size: 13px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Your week in review</p>
              <h1 style="font-family: Georgia, serif; font-size: 22px; color: #ffffff; margin: 0; font-weight: 400;">Weekly Synthesis ✨</h1>
            </td>
          </tr>

          <!-- Narrative -->
          <tr>
            <td style="padding: 28px 32px 20px;">
              <p style="font-family: Georgia, serif; font-size: 16px; color: #5C4A3A; line-height: 1.65; margin: 0;">
                Hi ${name} — ${narrative}
              </p>
            </td>
          </tr>

          <!-- Stats row -->
          <tr>
            <td style="padding: 0 32px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="text-align: center; padding: 12px; background: #F5F0EB; border-radius: 10px;">
                    <p style="font-family: Georgia, serif; font-size: 22px; color: #5C4A3A; margin: 0; font-weight: 600;">${totalCards}</p>
                    <p style="font-family: Georgia, serif; font-size: 12px; color: #8B7A6B; margin: 4px 0 0;">items tracked</p>
                  </td>
                  <td style="width: 12px;"></td>
                  <td style="text-align: center; padding: 12px; background: #F5F0EB; border-radius: 10px;">
                    <p style="font-family: Georgia, serif; font-size: 22px; color: #7CE8A3; margin: 0; font-weight: 600;">${completedCount}</p>
                    <p style="font-family: Georgia, serif; font-size: 12px; color: #8B7A6B; margin: 4px 0 0;">completed</p>
                  </td>
                  <td style="width: 12px;"></td>
                  <td style="text-align: center; padding: 12px; background: #F5F0EB; border-radius: 10px;">
                    <p style="font-family: Georgia, serif; font-size: 22px; color: #E8927C; margin: 0; font-weight: 600;">${staleNudges.length}</p>
                    <p style="font-family: Georgia, serif; font-size: 12px; color: #8B7A6B; margin: 4px 0 0;">need attention</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Domain breakdown -->
          <tr>
            <td style="padding: 8px 32px 20px;">
              <p style="font-family: Georgia, serif; font-size: 13px; color: #8B7A6B; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px;">Where your energy went</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${domainBars}
              </table>
            </td>
          </tr>

          <!-- Stale nudges -->
          ${staleSection}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center; border-top: 1px solid #F0EBE5;">
              <a href="https://anren.lovable.app" style="display: inline-block; background: #5C4A3A; color: #ffffff; font-family: Georgia, serif; font-size: 14px; padding: 12px 28px; border-radius: 24px; text-decoration: none;">Open Anren</a>
              <p style="font-family: Georgia, serif; font-size: 12px; color: #B8A99A; margin: 16px 0 0;">Sent with care from Anren</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
