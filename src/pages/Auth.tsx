import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { signInWithGoogleNative } from "@/lib/authNative";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      if (Capacitor.getPlatform() === "ios") {
        const result = await signInWithGoogleNative();
        if (!result.success) {
          toast.error("message" in result ? result.message : "Sign in failed. Please try again.");
        }
        return;
      }

      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("Sign in failed. Please try again.");
        console.error("OAuth error:", error);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      toast.error("Sign in failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-editorial text-[2.4rem] leading-tight tracking-[-0.01em]">Anren</h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          Say it out loud. Anren writes it up, titles it, and keeps it somewhere you can find again.
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="mt-9 w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-primary px-5 py-3.5 text-[0.92rem] text-primary-foreground transition-opacity hover:opacity-90"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-[0.78rem] leading-relaxed text-muted-foreground/70">
          Your notes are private to your account.
        </p>
      </div>
    </main>
  );
};

export default Auth;
