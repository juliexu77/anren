import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useGoogleCalendarList } from "@/hooks/useGoogleCalendarList";
import { useBirthdaySync } from "@/hooks/useBirthdaySync";
import { lovable } from "@/integrations/lovable/index";
import { Capacitor } from "@capacitor/core";
import { signInWithGoogleNative } from "@/lib/authNative";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    step,
    setStep,
    nextStep,
    skipStep,
    addLocalCard,
    getLocalCards,
    migrateLocalCards,
    saveCalendarPrefs,
    completeOnboarding,
  } = useOnboarding();

  const { calendars, loading: calLoading, fetchCalendarList } = useGoogleCalendarList();
  const { syncBirthdays } = useBirthdaySync();

  const [textInput, setTextInput] = useState("");
  const [selectedCals, setSelectedCals] = useState<string[]>(["primary"]);
  const [birthdaysOn, setBirthdaysOn] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // After auth arrives at step 4, migrate and advance
  useEffect(() => {
    if (user && step === 4) {
      migrateLocalCards().then(() => nextStep());
    }
  }, [user, step]);

  // Fetch calendar list when reaching step 5
  useEffect(() => {
    if (user && step === 5) {
      fetchCalendarList();
    }
  }, [user, step]);

  const progress = (step / 5) * 100;

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      if (Capacitor.getPlatform() === "ios") {
        const result = await signInWithGoogleNative();
        if (!result.success) {
          toast.error("message" in result ? result.message : "Sign in failed.");
        }
        return;
      }
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/onboarding",
        extraParams: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
        },
      });
      if (error) toast.error("Sign in failed.");
    } catch {
      toast.error("Sign in failed.");
    } finally {
      setSigningIn(false);
    }
  };

  // Returning user: sign in then check if onboarding is already complete
  const handleReturningUserSignIn = async () => {
    await handleGoogleSignIn();
  };

  // After auth, check if returning user has completed onboarding
  useEffect(() => {
    if (user && step === 1) {
      // User signed in from "Already have an account?" on step 1
      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();
        if (data?.onboarding_completed === true) {
          completeOnboarding();
          navigate("/", { replace: true });
        } else {
          // Skip to calendar prefs
          setStep(5);
        }
      })();
    }
  }, [user]);

  const handleFinish = async () => {
    await saveCalendarPrefs(selectedCals, birthdaysOn);
    if (birthdaysOn) {
      syncBirthdays().then((count) => {
        if (count && count > 0) toast.success(`Found ${count} birthdays`);
      });
    }
    completeOnboarding();
    navigate("/", { replace: true });
  };

  const toggleCal = (id: string) => {
    setSelectedCals((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const localCards = getLocalCards();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--bg))" }}>
      {/* Progress bar */}
      <div className="px-6 pt-4">
        <Progress value={progress} className="h-1" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center max-w-sm animate-fade-in">
            <h1 className="font-display text-5xl font-semibold mb-4" style={{ color: "hsl(var(--text))" }}>
              ANREN
            </h1>
            <p className="text-lg mb-2" style={{ color: "hsl(var(--text-muted))" }}>
              Where the mental load rests.
            </p>
            <p className="text-sm mb-10 leading-relaxed" style={{ color: "hsl(var(--text-muted) / 0.7)" }}>
              A quiet place for everything you're carrying.
            </p>
            <button
              onClick={nextStep}
              className="w-full py-3.5 rounded-full text-button font-medium"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--bg))",
              }}
            >
              Begin
            </button>
            <button
              onClick={handleReturningUserSignIn}
              disabled={signingIn}
              className="mt-3 py-2 px-4 text-xs underline underline-offset-2"
              style={{ color: "hsl(var(--text-muted) / 0.7)", background: "transparent", border: "none", cursor: "pointer" }}
            >
              Already have an account? Sign in
            </button>
          </div>
        )}

        {/* Step 2: First capture */}
        {step === 2 && (
          <div className="w-full max-w-sm animate-fade-in">
            <p className="text-xl font-display mb-1" style={{ color: "hsl(var(--text))" }}>
              What's one thing on your mind right now?
            </p>
            <p className="text-sm mb-6" style={{ color: "hsl(var(--text-muted))" }}>
              Something small. Something heavy. Whatever it is, set it down.
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="It can be anything…"
              className="w-full resize-none rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none"
              style={{
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--divider) / 0.3)",
                color: "hsl(var(--text))",
                minHeight: "120px",
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={skipStep}
                className="flex-1 py-3 rounded-full text-sm"
                style={{ color: "hsl(var(--text-muted))" }}
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (textInput.trim()) {
                    addLocalCard({ title: textInput.trim(), body: textInput.trim(), source: "text" });
                    setTextInput("");
                  }
                  nextStep();
                }}
                className="flex-1 py-3 rounded-full text-button font-medium"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--bg))",
                }}
              >
                Hold this for me
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Visual capture */}
        {step === 3 && (
          <div className="w-full max-w-sm animate-fade-in text-center">
            <p className="text-xl font-display mb-1" style={{ color: "hsl(var(--text))" }}>
              Notice something you want to hold onto?
            </p>
            <p className="text-sm mb-8" style={{ color: "hsl(var(--text-muted))" }}>
              A photo, a screenshot, a moment. Anren will keep it safe.
            </p>
            <label
              className="inline-flex flex-col items-center gap-2 cursor-pointer p-8 rounded-2xl mb-6"
              style={{
                background: "hsl(var(--surface))",
                border: "1px dashed hsl(var(--divider) / 0.4)",
              }}
            >
              <Camera className="w-8 h-8" style={{ color: "hsl(var(--text-muted))" }} />
              <span className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>
                Tap to capture
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    addLocalCard({ title: "Visual capture", body: "", source: "image", imageUrl: url });
                    toast.success("Held.");
                    nextStep();
                  }
                }}
              />
            </label>
            <div>
              <button
                onClick={skipStep}
                className="py-3 px-6 rounded-full text-sm"
                style={{ color: "hsl(var(--text-muted))" }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Value bridge + Auth */}
        {step === 4 && !user && (
          <div className="w-full max-w-sm animate-fade-in text-center">
            {localCards.length > 0 && (
              <p className="text-sm mb-2" style={{ color: "hsl(var(--text-muted))" }}>
                You have {localCards.length} {localCards.length === 1 ? "thing" : "things"} resting here.
              </p>
            )}
            <p className="text-xl font-display mb-2" style={{ color: "hsl(var(--text))" }}>
              Now let's anchor these to your day.
            </p>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "hsl(var(--text-muted))" }}>
              Your calendar gives Anren the rhythm of your life — so what you're holding finds its right place in time.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full py-3.5 rounded-full text-button font-medium inline-flex items-center justify-center gap-2"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--bg))",
              }}
            >
              {signingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Sign in with Google
            </button>
          </div>
        )}

        {/* Step 4 loading (post-auth, migrating) */}
        {step === 4 && user && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "hsl(var(--accent))" }} />
            <p className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>Setting things in place…</p>
          </div>
        )}

        {/* Step 5: Calendar prefs */}
        {step === 5 && (
          <div className="w-full max-w-sm animate-fade-in">
            <p className="text-xl font-display mb-1" style={{ color: "hsl(var(--text))" }}>
              Which calendars feel like yours?
            </p>
            <p className="text-sm mb-6" style={{ color: "hsl(var(--text-muted))" }}>
              Pick the ones that hold the rhythm of your life.
            </p>

            {calLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(var(--text-muted))" }} />
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                    style={{
                      background: "hsl(var(--surface))",
                      border: `1px solid hsl(var(--divider) / 0.25)`,
                    }}
                  >
                    <Checkbox
                      checked={selectedCals.includes(cal.id)}
                      onCheckedChange={() => toggleCal(cal.id)}
                    />
                    {cal.backgroundColor && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: cal.backgroundColor }}
                      />
                    )}
                    <span className="text-sm truncate" style={{ color: "hsl(var(--text))" }}>
                      {cal.summary}
                    </span>
                    {cal.primary && (
                      <span className="text-[10px] uppercase tracking-wider ml-auto shrink-0" style={{ color: "hsl(var(--text-muted))" }}>
                        Primary
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* Birthday toggle */}
            <div
              className="flex items-center justify-between p-4 rounded-xl mb-8"
              style={{
                background: "hsl(var(--surface))",
                border: "1px solid hsl(var(--divider) / 0.25)",
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--text))" }}>
                  Hold birthdays & milestones
                </p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>
                  From your contacts' calendars
                </p>
              </div>
              <Switch checked={birthdaysOn} onCheckedChange={setBirthdaysOn} />
            </div>

            <button
              onClick={handleFinish}
              disabled={selectedCals.length === 0}
              className="w-full py-3.5 rounded-full text-button font-medium disabled:opacity-40"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--bg))",
              }}
            >
              I'm ready
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
