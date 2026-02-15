import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SendGrid sends multipart/form-data POST
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
      throw new Error("Invalid content type: " + contentType);
    }

    const formData = await req.formData();

    const to = (formData.get("to") as string) || "";
    const from = (formData.get("from") as string) || "";
    const subject = (formData.get("subject") as string) || "Forwarded Note";
    const text = (formData.get("text") as string) || "";
    const html = (formData.get("html") as string) || "";

    console.log("Inbound email from:", from, "subject:", subject);

    // Extract sender email to find user
    const senderEmail = from.match(/<(.+?)>/)?.[1] || from.trim();

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
      .single();

    if (profileError || !profile) {
      console.error("No user found for email:", senderEmail);
      // Return 200 so SendGrid doesn't retry
      return new Response(JSON.stringify({ message: "No matching user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean body text - prefer plain text, strip forwarding headers
    let noteBody = text || html.replace(/<[^>]*>/g, "");
    // Remove common forwarding prefixes
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
    // Return 200 to prevent SendGrid retries on permanent errors
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
