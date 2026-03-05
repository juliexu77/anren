import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ExtensionAuthComplete = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Finishing sign-in for the extension\u2026");

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        const session = data.session;
        // #region agent log
        fetch('http://127.0.0.1:7930/ingest/47541dce-e71a-46a9-a7f1-617457b3db45',{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'X-Debug-Session-Id':'f4b487',
          },
          body:JSON.stringify({
            sessionId:'f4b487',
            runId:'auth-flow',
            hypothesisId:'H2',
            location:'src/pages/ExtensionAuthComplete.tsx:completeAuth',
            message:'ExtensionAuthComplete session lookup',
            data:{ hasSession: !!session },
            timestamp:Date.now(),
          }),
        }).catch(()=>{});
        // #endregion
        if (!session) {
          setStatus("No active session found. Redirecting\u2026");
          setTimeout(() => {
            if (!cancelled) navigate("/auth", { replace: true });
          }, 1500);
          return;
        }

        window.postMessage(
          {
            source: "anren-web",
            type: "ANREN_EXTENSION_AUTH",
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          },
          window.location.origin,
        );

        // Show a short message in case the extension isn't installed.
        setStatus("Signed in. You can close this tab.");
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("Extension auth complete error:", err);
        setStatus("Failed to complete sign-in. Redirecting\u2026");
        setTimeout(() => {
          if (!cancelled) navigate("/auth", { replace: true });
        }, 1500);
      }
    };

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {status}
      </p>
    </div>
  );
};

export default ExtensionAuthComplete;

