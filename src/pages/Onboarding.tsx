import { useState, useEffect, useRef, useCallback } from "react";
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
import { Mic, Square, Loader2 } from "lucide-react";
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

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [capturedItems, setCapturedItems] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (user && step === 4) {
      migrateLocalCards().then(() => nextStep());
    }
  }, [user, step]);

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

  const handleReturningUserSignIn = async () => {
    await handleGoogleSignIn();
  };

  useEffect(() => {
    if (user && step === 1) {
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
          setStep(5);
        }
      })();
    }
  }, [user]);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsed(0);
  }, []);

  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
        }
        const base64 = btoa(binary);
        await handleTranscription(base64, recorder.mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setRecordingError("Microphone access denied.");
        setShowTextFallback(true);
      } else {
        setRecordingError("Could not start recording.");
        setShowTextFallback(true);
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleTranscription = async (audioBase64: string, mimeType: string) => {
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-voice", {
        body: { audioBase64, mimeType, extractItems: true },
      });
      if (error) throw error;
      if (data?.items && Array.isArray(data.items)) {
        const titles: string[] = [];
        for (const item of data.items) {
          addLocalCard({
            title: item.title,
            body: item.body || item.title,
            source: "voice",
          });
          titles.push(item.title);
        }
        setCapturedItems(titles);
      } else if (data?.title && data?.body) {
        addLocalCard({
          title: data.title,
          body: data.body,
          source: "voice",
        });
        setCapturedItems([data.title]);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error("Couldn't process that. Try again or type instead.");
      setShowTextFallback(true);
      setIsTranscribing(false);
      return;
    }
    setIsTranscribing(false);
  };

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
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex flex-col bg-bg-color">
      {/* Progress bar */}
      <div className="px-6 pt-4">
        <Progress value={progress} className="h-1" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Step 1: Emotional hook */}
        {step === 1 && (
          <div className="text-center max-w-sm animate-fade-in">
            <h1 className="font-display text-5xl font-semibold mb-6 text-text-primary">
              ANREN
            </h1>
            <p className="text-xl font-display mb-3 text-text-primary">
              Where the mental load rests.
            </p>
            <p className="text-sm leading-relaxed mb-12 text-text-muted-color/70">
              The appointments you're juggling. The things you can't forget.
              The invisible weight no one sees. Set it all down here.
            </p>
            <button
              onClick={nextStep}
              className="accent-btn w-full py-3.5 rounded-full text-button"
            >
              Begin
            </button>
            <button
              onClick={handleReturningUserSignIn}
              disabled={signingIn}
              className="mt-3 py-2 px-4 text-xs underline underline-offset-2 bg-transparent border-none cursor-pointer text-text-muted-color/70"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}

        {/* Step 2: How it works */}
        {step === 2 && (
          <div className="text-center max-w-sm animate-fade-in">
            <p className="text-xl font-display mb-8 text-text-primary">
              How Anren works
            </p>
            <div className="space-y-6 mb-10 text-left">
              {[
                {
                  num: "1",
                  title: "Capture anything",
                  desc: "Say it, type it, snap it. Anren holds it all.",
                },
                {
                  num: "2",
                  title: "It finds its place",
                  desc: "Notes become cards, organized by what matters.",
                },
                {
                  num: "3",
                  title: "Your day, clear",
                  desc: "Calendar, to-dos, and reminders — all in one quiet view.",
                },
              ].map((item) => (
                <div key={item.num} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium bg-accent/15 text-accent">
                    {item.num}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5 text-text-primary">
                      {item.title}
                    </p>
                    <p className="text-xs leading-relaxed text-text-muted-color">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={nextStep}
              className="accent-btn w-full py-3.5 rounded-full text-button"
            >
              Let's try it
            </button>
          </div>
        )}

        {/* Step 3: Voice-first capture */}
        {step === 3 && !isTranscribing && capturedItems.length === 0 && (
          <div className="w-full max-w-sm animate-fade-in text-center">
            <p className="text-2xl font-display mb-2 text-text-primary">
              What are you holding?
            </p>
            <p className="text-sm mb-8 text-text-muted-color">
              Small things. Big things. Just say it out loud.
            </p>

            {/* Mic button */}
            {!showTextFallback && (
              <div className="flex flex-col items-center gap-4 mb-6">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isRecording
                      ? "hsl(0 70% 55% / 0.15)"
                      : "hsl(var(--accent) / 0.12)",
                  }}
                >
                  {isRecording && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: "hsl(0 70% 55% / 0.08)" }}
                    />
                  )}
                  {isRecording ? (
                    <Square
                      className="w-8 h-8"
                      style={{ color: "hsl(0 70% 55%)" }}
                      fill="hsl(0 70% 55%)"
                    />
                  ) : (
                    <Mic className="w-8 h-8 text-accent" />
                  )}
                </button>

                {isRecording ? (
                  <span className="text-xl font-mono tabular-nums text-text-primary/80">
                    {timeStr}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-accent">
                    Speak
                  </span>
                )}

                {recordingError && (
                  <p className="text-xs text-destructive">
                    {recordingError}
                  </p>
                )}

                {!isRecording && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider mb-2 text-text-muted-color/50">
                      Try something like
                    </p>
                    {[
                      "Schedule a parent-teacher conference for Sage.",
                      "Pick up tomatoes for dinner.",
                      "Plan our summer trip.",
                      "Book a dentist appointment for me.",
                      "Remember school early pickup on Friday.",
                    ].map((phrase) => (
                      <p
                        key={phrase}
                        className="text-xs italic text-text-muted-color/45"
                      >
                        "{phrase}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text fallback */}
            {showTextFallback && (
              <div className="mb-6">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type what's on your mind…"
                  className="w-full resize-none rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none"
                  style={{ minHeight: "100px" }}
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  cleanupRecording();
                  skipStep();
                }}
                className="flex-1 py-3 rounded-full text-sm text-text-muted-color"
              >
                Skip
              </button>
              {showTextFallback ? (
                <button
                  onClick={() => {
                    if (textInput.trim()) {
                      addLocalCard({
                        title: textInput.trim().split("\n")[0].slice(0, 100),
                        body: textInput.trim(),
                        source: "text",
                      });
                    }
                    nextStep();
                  }}
                  disabled={!textInput.trim()}
                  className="accent-btn flex-1 py-3 rounded-full text-button disabled:opacity-40"
                >
                  Hold this for me
                </button>
              ) : (
                <button
                  onClick={() => setShowTextFallback(true)}
                  className="flex-1 py-3 rounded-full text-sm text-text-muted-color"
                >
                  or type instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Transcribing state */}
        {step === 3 && isTranscribing && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
            <p className="text-sm text-text-muted-color">
              Holding that for you…
            </p>
          </div>
        )}

        {/* Step 3: Captured items confirmation */}
        {step === 3 && !isTranscribing && capturedItems.length > 0 && (
          <div className="w-full max-w-sm animate-fade-in text-center">
            <p className="text-lg font-display mb-5 text-text-primary">
              Holding:
            </p>
            <div className="space-y-2.5 mb-8 text-left">
              {capturedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-color border border-divider-color/20"
                >
                  <span className="text-xs mt-0.5 text-accent">•</span>
                  <span className="text-sm text-text-primary">{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setCapturedItems([]);
                nextStep();
              }}
              className="accent-btn w-full py-3.5 rounded-full text-button"
            >
              Hold these for me
            </button>
          </div>
        )}

        {/* Step 4: Value bridge + Auth */}
        {step === 4 && !user && (
          <div className="w-full max-w-sm animate-fade-in text-center">
            {localCards.length > 0 && (
              <p className="text-sm mb-2 text-text-muted-color">
                You have {localCards.length}{" "}
                {localCards.length === 1 ? "thing" : "things"} resting here.
              </p>
            )}
            <p className="text-xl font-display mb-2 text-text-primary">
              Now let's anchor these to your day.
            </p>
            <p className="text-sm mb-8 leading-relaxed text-text-muted-color">
              Your calendar gives Anren the rhythm of your life — so what you're
              holding finds its right place in time.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="accent-btn w-full py-3.5 rounded-full text-button inline-flex items-center justify-center gap-2"
            >
              {signingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Sign in with Google
            </button>
          </div>
        )}

        {/* Step 4 loading (post-auth, migrating) */}
        {step === 4 && user && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
            <p className="text-sm text-text-muted-color">
              Setting things in place…
            </p>
          </div>
        )}

        {/* Step 5: Calendar prefs */}
        {step === 5 && (
          <div className="w-full max-w-sm animate-fade-in">
            <p className="text-xl font-display mb-1 text-text-primary">
              Which calendars feel like yours?
            </p>
            <p className="text-sm mb-6 text-text-muted-color">
              Pick the ones that hold the rhythm of your life.
            </p>

            {calLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-text-muted-color" />
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-surface-color border border-divider-color/25"
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
                    <span className="text-sm truncate text-text-primary">
                      {cal.summary}
                    </span>
                    {cal.primary && (
                      <span className="text-[10px] uppercase tracking-wider ml-auto shrink-0 text-text-muted-color">
                        Primary
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* Birthday toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl mb-8 bg-surface-color border border-divider-color/25">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Hold birthdays & milestones
                </p>
                <p className="text-xs mt-0.5 text-text-muted-color">
                  From your contacts' calendars
                </p>
              </div>
              <Switch checked={birthdaysOn} onCheckedChange={setBirthdaysOn} />
            </div>

            <button
              onClick={handleFinish}
              disabled={selectedCals.length === 0}
              className="accent-btn w-full py-3.5 rounded-full text-button disabled:opacity-40"
            >
              I'm ready
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
