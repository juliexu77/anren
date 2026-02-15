import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, "provider_token:", !!session?.provider_token, "provider_refresh_token:", !!session?.provider_refresh_token);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Capture Google OAuth tokens on sign-in
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") &&
          session?.provider_token &&
          session?.user
        ) {
          const updateData: Record<string, string> = {
            google_access_token: session.provider_token,
            google_token_expires_at: new Date(
              Date.now() + 3600 * 1000
            ).toISOString(),
          };
          if (session.provider_refresh_token) {
            updateData.google_refresh_token = session.provider_refresh_token;
          }
          console.log("Saving Google tokens to profile...", Object.keys(updateData));
          supabase
            .from("profiles")
            .update(updateData)
            .eq("user_id", session.user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to save Google tokens:", error);
              else console.log("Google tokens saved to profile successfully");
            });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
