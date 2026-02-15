import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple MIME body extractor
function extractBodyFromMime(raw: string): string {
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split("--" + boundary);
    for (const part of parts) {
      if (part.includes("Content-Type: text/plain")) {
        const bodyStart = part.indexOf("\r\n\r\n") ?? part.indexOf("\n\n");
        if (bodyStart !== -1) {
          let body = part.substring(bodyStart + (part.includes("\r\n\r\n") ? 4 : 2));
          body = body.replace(/--\s*$/, "").trim();
          if (part.includes("Content-Transfer-Encoding: quoted-printable")) {
            body = body.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
              String.fromCharCode(parseInt(hex, 16))
            );
          }
          if (part.includes("Content-Transfer-Encoding: base64")) {
            try { body = atob(body.replace(/\s/g, "")); } catch { /* keep as-is */ }
          }
          return body.trim();
        }
      }
    }
  }
  const headerEnd = raw.indexOf("\r\n\r\n") ?? raw.indexOf("\n\n");
  if (headerEnd !== -1) return raw.substring(headerEnd + 4).trim();
  return raw;
}

function extractFromEmail(raw: string): string {
  const fromMatch = raw.match(/^From:\s*(.+)$/im);
  if (fromMatch) {
    const emailMatch = fromMatch[1].match(/<(.+?)>/);
    return emailMatch ? emailMatch[1] : fromMatch[1].trim();
  }
  return "";
}

function extractSubject(raw: string): string {
  const subjectMatch = raw.match(/^Subject:\s*(.+)$/im);
  return subjectMatch ? subjectMatch[1].trim() : "Email Note";
}

// Use AI to parse the email into a concise note
async function parseEmailWithAI(subject: string, body: string): Promise<{ title: string; summary: string; body: string; category: string }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return { title: subject, summary: "", body, category: "finance" };
  }

  const workstreams = [
    "finance", "childcare", "extracurriculars", "doctor",
    "house-maintenance", "home-organization", "household-inventory",
    "kids-clothes", "food", "laundry"
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        tools: [
          {
            name: "create_note",
            description: "Create a concise note from an email",
            input_schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short title (5-10 words max)" },
                summary: { type: "string", description: "A concise 1-line summary (max 80 chars) with the most important details — include dates, amounts, deadlines, or links if present. This is what users see on the card preview." },
                body: { type: "string", description: "Key action items or full details in 1-3 short sentences. Include any URLs/links from the email." },
                category: { type: "string", enum: workstreams, description: "Best matching workstream" }
              },
              required: ["title", "summary", "body", "category"]
            }
          }
        ],
        tool_choice: { type: "tool", name: "create_note" },
        messages: [
          {
            role: "user",
            content: `Parse this forwarded email into a concise actionable note. Extract only the key info — what needs to be done, by when, for whom. IMPORTANT: Always include specific dates/deadlines and preserve any URLs or links from the email body.\n\nSubject: ${subject}\n\nBody:\n${body.substring(0, 2000)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI parse failed:", response.status);
      return { title: subject, summary: "", body, category: "finance" };
    }

    const data = await response.json();
    const toolUse = data.content?.find((b: any) => b.type === "tool_use");
    if (toolUse?.input) {
      return {
        title: toolUse.input.title || subject,
        summary: toolUse.input.summary || "",
        body: toolUse.input.body || body,
        category: toolUse.input.category || "finance",
      };
    }
  } catch (e) {
    console.error("AI parse error:", e);
  }

  return { title: subject, summary: "", body, category: "finance" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    
    let senderEmail = "";
    let subject = "Email Note";
    let rawBody = "";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const rawEmail = formData.get("email") as string;
      
      if (rawEmail) {
        console.log("Processing raw MIME email");
        senderEmail = extractFromEmail(rawEmail);
        subject = extractSubject(rawEmail);
        rawBody = extractBodyFromMime(rawEmail);
      } else {
        const from = (formData.get("from") as string) || "";
        subject = (formData.get("subject") as string) || "Email Note";
        const text = (formData.get("text") as string) || "";
        const html = (formData.get("html") as string) || "";
        senderEmail = from.match(/<(.+?)>/)?.[1] || from.trim();
        rawBody = text || html.replace(/<[^>]*>/g, "");
      }
    } else {
      throw new Error("Invalid content type: " + contentType);
    }

    console.log("Inbound email from:", senderEmail, "subject:", subject);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", senderEmail)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("No user found for email:", senderEmail);
      return new Response(JSON.stringify({ message: "No matching user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI-parse the email into a concise note
    const cleanSubject = subject.replace(/^(Fwd?|Re): ?/i, "").trim();
    const parsed = await parseEmailWithAI(cleanSubject, rawBody);
    console.log("AI parsed:", parsed.title, "| category:", parsed.category);

    const { error: insertError } = await supabase.from("cards").insert({
      user_id: profile.user_id,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
      category: parsed.category,
      source: "text",
    });

    if (insertError) {
      console.error("Failed to create card:", insertError);
      throw new Error("Insert failed");
    }

    console.log("Card created for user:", profile.user_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("inbound-email error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
