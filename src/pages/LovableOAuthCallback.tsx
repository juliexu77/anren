import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Lovable Cloud Auth redirects to /~oauth/callback after Google sign-in.
 * This route exists so that redirect does not 404. The auth library typically
 * processes the URL (hash/query) on load; we show a loader and redirect to /.
 */
export default function LovableOAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/", { replace: true }), 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Completing sign-in...</p>
    </div>
  );
}
