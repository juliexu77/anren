import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ExtensionAuthStart = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const startAuth = async () => {
      try {
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
            hypothesisId:'H1',
            location:'src/pages/ExtensionAuthStart.tsx:startAuth',
            message:'ExtensionAuthStart initiating lovable auth',
            data:{ redirectUri:`${window.location.origin}/extension-auth-complete` },
            timestamp:Date.now(),
          }),
        }).catch(()=>{});
        // #endregion
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/extension-auth-complete`,
          extraParams: {
            access_type: "offline",
            prompt: "consent",
            scope:
              "openid email profile https://www.googleapis.com/auth/calendar",
          },
        });

        if (cancelled) return;

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Extension OAuth error:", error);
          toast.error("Sign in failed. Please try again.");
          navigate("/auth", { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("Extension OAuth error:", err);
        toast.error("Sign in failed. Please try again.");
        navigate("/auth", { replace: true });
      }
    };

    startAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Opening Google sign-in for the Anren extension&hellip;
      </p>
    </div>
  );
};

export default ExtensionAuthStart;

