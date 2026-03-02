import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAppOrigin } from "@/lib/utils";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connecting Google Calendar...");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("No authorization code received");
      toast.error("Google authorization failed");
      setTimeout(() => navigate("/"), 2000);
      return;
    }

    const exchangeCode = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error("Not signed in");

        const redirectUri = `${getAppOrigin()}/google-callback`;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth-callback?action=exchange-code`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, redirectUri }),
          }
        );

        const result = await res.json();
        if (result.error) throw new Error(result.error);

        setStatus("Connected! Redirecting...");
        toast.success("Google Calendar connected!");
        setTimeout(() => navigate("/"), 1000);
      } catch (e: any) {
        console.error("Code exchange error:", e);
        setStatus("Failed to connect");
        toast.error(e.message || "Failed to connect Google Calendar");
        setTimeout(() => navigate("/"), 2000);
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
