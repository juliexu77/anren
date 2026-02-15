import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple MIME body extractor — pulls plain text from raw MIME message
function extractBodyFromMime(raw: string): string {
  // Try to find plain text part
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split("--" + boundary);
    for (const part of parts) {
      if (part.includes("Content-Type: text/plain")) {
        // Extract content after double newline
        const bodyStart = part.indexOf("\r\n\r\n") ?? part.indexOf("\n\n");
        if (bodyStart !== -1) {
          let body = part.substring(bodyStart + (part.includes("\r\n\r\n") ? 4 : 2));
          // Remove trailing boundary markers
          body = body.replace(/--\s*$/, "").trim();
          // Handle quoted-printable encoding
          if (part.includes("Content-Transfer-Encoding: quoted-printable")) {
            body = body.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
              String.fromCharCode(parseInt(hex, 16))
            );
          }
          // Handle base64 encoding
          if (part.includes("Content-Transfer-Encoding: base64")) {
            try {
              body = atob(body.replace(/\s/g, ""));
            } catch { /* keep as-is */ }
          }
          return body.trim();
        }
      }
    }
  }
  
  // No multipart — try raw body after headers
  const headerEnd = raw.indexOf("\r\n\r\n") ?? raw.indexOf("\n\n");
  if (headerEnd !== -1) {
    return raw.substring(headerEnd + 4).trim();
  }
  
  return raw;
}

// Extract sender email from MIME headers
function extractFromEmail(raw: string): string {
  const fromMatch = raw.match(/^From:\s*(.+)$/im);
  if (fromMatch) {
    const emailMatch = fromMatch[1].match(/<(.+?)>/);
    return emailMatch ? emailMatch[1] : fromMatch[1].trim();
  }
  return "";
}

// Extract subject from MIME headers
function extractSubject(raw: string): string {
  const subjectMatch = raw.match(/^Subject:\s*(.+)$/im);
  return subjectMatch ? subjectMatch[1].trim() : "Email Note";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    
    let senderEmail = "";
    let subject = "Email Note";
    let noteBody = "";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      
      // Check if raw MIME email is present (SendGrid "Send Raw" mode)
      const rawEmail = formData.get("email") as string;
      
      if (rawEmail) {
        console.log("Processing raw MIME email");
        senderEmail = extractFromEmail(rawEmail);
        subject = extractSubject(rawEmail);
        noteBody = extractBodyFromMime(rawEmail);
      } else {
        // Standard parsed fields
        const from = (formData.get("from") as string) || "";
        subject = (formData.get("subject") as string) || "Email Note";
        const text = (formData.get("text") as string) || "";
        const html = (formData.get("html") as string) || "";
        
        senderEmail = from.match(/<(.+?)>/)?.[1] || from.trim();
        noteBody = text || html.replace(/<[^>]*>/g, "");
      }
    } else {
      throw new Error("Invalid content type: " + contentType);
    }

    console.log("Inbound email from:", senderEmail, "subject:", subject);
    console.log("Body length:", noteBody.length);

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email in profiles
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

    // Clean body text
    noteBody = noteBody.replace(/^-+ ?Forwarded message ?-+\n/im, "").trim();

    // Create the card
    const { error: insertError } = await supabase.from("cards").insert({
      user_id: profile.user_id,
      title: subject.replace(/^(Fwd?|Re): ?/i, "").trim() || "Email Note",
      body: noteBody,
      category: "finance",
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
  } catch (e: any) {
    console.error("inbound-email error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
