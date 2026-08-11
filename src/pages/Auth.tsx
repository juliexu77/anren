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
          toast.error("message" in result ? result.message : "sign in failed. please try again.");
        }
        return;
      }

      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("sign in failed. please try again.");
        console.error("OAuth error:", error);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      toast.error("sign in failed. please try again.");
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("sign in failed. please try again.");
        console.error("Apple OAuth error:", error);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      toast.error("sign in failed. please try again.");
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
        <h1 className="font-editorial text-[2.4rem] leading-tight tracking-[-0.01em] lowercase">anren</h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          where the mental load rests.
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
          continue with Google
        </button>

        <button
          onClick={handleAppleSignIn}
          className="mt-3 w-full inline-flex items-center justify-center gap-2.5 rounded-full border border-hairline bg-transparent px-5 py-3.5 text-[0.92rem] text-foreground transition-colors hover:bg-foreground/[0.04]"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M16.36 12.72c.02 2.6 2.28 3.47 2.3 3.48-.02.06-.36 1.24-1.2 2.45-.72 1.05-1.47 2.09-2.66 2.11-1.16.02-1.54-.69-2.87-.69-1.33 0-1.75.67-2.85.71-1.14.04-2.01-1.13-2.74-2.17-1.53-2.2-2.7-6.22-1.13-8.94.78-1.35 2.17-2.2 3.68-2.23 1.12-.02 2.17.75 2.87.75.7 0 1.98-.93 3.34-.79.57.02 2.17.21 3.19 1.56-.08.05-1.91 1.12-1.9 3.34zM14.6 4.9c.62-.75 1.04-1.79.93-2.83-.9.04-1.98.6-2.62 1.35-.57.66-1.07 1.72-.94 2.73 1 .08 2.01-.51 2.63-1.25z" />
          </svg>
          continue with Apple
        </button>

        <p className="mt-6 text-[0.78rem] leading-relaxed text-muted-foreground/70">
          your notes are private to your account.
        </p>
      </div>
    </main>
  );
};

export default Auth;
