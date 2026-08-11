import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(url, serviceKey);

    // Remove stored audio files for this user.
    const { data: files } = await admin.storage.from("voice-notes").list(userId, { limit: 1000 });
    if (files?.length) {
      await admin.storage.from("voice-notes").remove(files.map((f) => `${userId}/${f.name}`));
    }

    // Remove rows the user owns. Passages cascade from notes.
    for (const table of ["note_passages", "notes", "projects", "weekly_digests", "profiles"]) {
      const column = table === "note_passages" ? "user_id" : "user_id";
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error && !/does not exist|column .* does not exist/i.test(error.message)) {
        console.error(`delete from ${table} failed:`, error.message);
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("auth delete failed:", deleteError.message);
      return new Response(JSON.stringify({ error: "Could not delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
