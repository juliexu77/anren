import { useEffect, useState } from "react";
import { signInWithGoogle, getClient, migrateLocalCards } from "../shared/supabaseClient";
import type { User } from "@supabase/supabase-js";

type OnboardingStep = 1 | 2 | 3 | 4;

interface PageContext {
  pageTitle?: string;
  pageUrl?: string;
  selectedText?: string;
}

interface LocalCard {
  id: string;
  title: string;
  body: string;
  source: string;
}

function getChromeStorage() {
  const chromeAny = globalThis as unknown as {
    chrome?: {
      storage?: {
        local?: {
          get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          set: (items: Record<string, unknown>, cb?: () => void) => void;
          remove: (keys: string[]) => void;
        };
      };
    };
  };
  return chromeAny.chrome?.storage?.local ?? null;
}

function saveLocalCard(card: Omit<LocalCard, "id">) {
  const storage = getChromeStorage();
  const newCard = { ...card, id: crypto.randomUUID() };

  if (storage) {
    storage.get(["anren_local_cards"], (items) => {
      const cards = (items.anren_local_cards as LocalCard[]) || [];
      cards.push(newCard);
      storage.set({ anren_local_cards: cards });
    });
  } else {
    const cards = JSON.parse(localStorage.getItem("anren_local_cards") || "[]");
    cards.push(newCard);
    localStorage.setItem("anren_local_cards", JSON.stringify(cards));
  }
}

interface Props {
  pageContext: PageContext | null;
  onComplete: () => void;
}

export default function ExtensionOnboarding({ pageContext, onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [noteText, setNoteText] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [localCardCount, setLocalCardCount] = useState(0);

  // Listen for auth state
  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Check existing session
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));

    return () => subscription.unsubscribe();
  }, []);

  // Count local cards for step 3
  useEffect(() => {
    const storage = getChromeStorage();
    if (storage) {
      storage.get(["anren_local_cards"], (items) => {
        setLocalCardCount(((items.anren_local_cards as LocalCard[]) || []).length);
      });
    } else {
      try {
        setLocalCardCount(JSON.parse(localStorage.getItem("anren_local_cards") || "[]").length);
      } catch { setLocalCardCount(0); }
    }
  }, [step]);

  // When user authenticates at step 3, migrate cards and advance
  useEffect(() => {
    if (user && step === 3) {
      migrateLocalCards().then(() => {
        // Check if onboarding already completed (returning user)
        checkOnboardingCompleted().then((completed) => {
          if (completed) {
            markOnboardingDone();
            onComplete();
          } else {
            setStep(4);
          }
        });
      });
    }
  }, [user, step]);

  async function checkOnboardingCompleted(): Promise<boolean> {
    const supabase = getClient();
    if (!supabase || !user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    return data?.onboarding_completed === true;
  }

  function markOnboardingDone() {
    const storage = getChromeStorage();
    if (storage) {
      storage.set({ anren_onboarding_step: 5 });
    } else {
      localStorage.setItem("anren_onboarding_step", "5");
    }
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError("Sign in failed. Please try again.");
      setSigningIn(false);
    }
    // If no error, OAuth opens in a new tab.
    // onAuthStateChange will pick up the session.
  };

  const handleReturningUser = async () => {
    setSigningIn(true);
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError("Sign in failed. Please try again.");
      setSigningIn(false);
    }
  };

  const handleCapture = () => {
    const text = [
      pageContext?.selectedText,
      noteText.trim(),
    ].filter(Boolean).join("\n\n");

    if (text.trim()) {
      saveLocalCard({
        title: text.split("\n")[0].slice(0, 100) || "Captured thought",
        body: text,
        source: "extension",
      });
    }
    setNoteText("");
    setStep(3);
  };

  const handleFinishCalendarPrefs = async () => {
    // Save prefs to profile
    const supabase = getClient();
    if (supabase && user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);
    }
    markOnboardingDone();
    onComplete();
    // Open the main Anren app so the user can link calendars just like on web/iOS.
    try {
      window.open("https://anren.app?open=calendar", "_blank");
    } catch {
      // ignore if window.open is blocked
    }
  };

  const progress = (step / 4) * 100;
  const hasContext = Boolean(pageContext?.selectedText?.trim() || pageContext?.pageTitle?.trim());

  return (
    <div className="anren-panel" style={{ justifyContent: "space-between" }}>
      {/* Progress bar */}
      <div className="onboarding-progress-bar">
        <div
          className="onboarding-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="onboarding-content">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="onboarding-step onboarding-step-center">
            <h1 className="onboarding-title">ANREN</h1>
            <p className="onboarding-subtitle">Where the mental load rests.</p>
            <p className="onboarding-body">
              A quiet place for everything you're carrying.
            </p>
            <button
              className="onboarding-btn-primary"
              onClick={() => setStep(2)}
            >
              Begin
            </button>
            <button
              className="onboarding-btn-text"
              onClick={handleReturningUser}
              disabled={signingIn}
            >
              Already have an account? Sign in
            </button>
            {authError && <p className="onboarding-error">{authError}</p>}
          </div>
        )}

        {/* Step 2: Contextual Capture */}
        {step === 2 && (
          <div className="onboarding-step">
            {hasContext ? (
              <>
                <p className="onboarding-heading">Something caught your eye.</p>
                <p className="onboarding-body">
                  Add a thought, or just hold it.
                </p>
                <div className="onboarding-context-preview">
                  <p className="intake-preview-text">
                    {pageContext?.selectedText || pageContext?.pageTitle}
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="onboarding-heading">
                  What's one thing on your mind?
                </p>
                <p className="onboarding-body">
                  Something small. Something heavy. Whatever it is, set it down.
                </p>
              </>
            )}
            <textarea
              className="intake-note-input"
              placeholder={hasContext ? "Add a note…" : "It can be anything…"}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="onboarding-btn-row">
              <button
                className="onboarding-btn-secondary"
                onClick={() => setStep(3)}
              >
                Skip
              </button>
              <button
                className="onboarding-btn-primary"
                onClick={handleCapture}
                disabled={!noteText.trim() && !hasContext}
              >
                Hold this for me
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Value bridge + Auth */}
        {step === 3 && !user && (
          <div className="onboarding-step onboarding-step-center">
            {localCardCount > 0 && (
              <p className="onboarding-count">
                {localCardCount} {localCardCount === 1 ? "thing" : "things"} resting here.
              </p>
            )}
            <p className="onboarding-heading">
              Now let's make sure these are yours.
            </p>
            <p className="onboarding-body">
              Sign in so Anren can hold things across your devices.
            </p>
            <button
              className="onboarding-btn-primary onboarding-btn-google"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? (
                <span className="onboarding-spinner" />
              ) : (
                <svg className="onboarding-google-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Sign in with Google
            </button>
            {authError && <p className="onboarding-error">{authError}</p>}
          </div>
        )}

        {/* Step 3 loading (post-auth, migrating) */}
        {step === 3 && user && (
          <div className="onboarding-step onboarding-step-center">
            <span className="onboarding-spinner onboarding-spinner-lg" />
            <p className="onboarding-body">Setting things in place…</p>
          </div>
        )}

        {/* Step 4: Calendar prefs (simplified for extension) */}
        {step === 4 && (
          <div className="onboarding-step onboarding-step-center">
            <p className="onboarding-heading">Connect your calendar.</p>
            <p className="onboarding-body">
              In the Anren app, you can link Google Calendar and choose which calendars
              to include in your brief. Everything you hold here will sit alongside
              your day there.
            </p>
            <button
              className="onboarding-btn-primary"
              onClick={handleFinishCalendarPrefs}
            >
              Open Anren
            </button>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="onboarding-dots">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`onboarding-dot ${s === step ? "onboarding-dot-active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
