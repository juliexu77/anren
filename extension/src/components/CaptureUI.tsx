import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AnrenGuidanceTooltips,
  hasAnrenGuidanceBeenSeen,
} from "./AnrenGuidanceTooltips";
import { callIntakeApi } from "../shared/intakeApi";
import {
  createCard,
  fetchRecentCards,
  getClient,
  getWebAppAuthUrl,
  hasSupabaseConfig,
  type Card,
} from "../shared/supabaseClient";

type CaptureStatus = "idle" | "saving" | "saved";
type DataStatus = "idle" | "loading" | "ready";

type RestingHereItem = {
  id: string;
  title: string;
  body: string;
  createdAtLabel: string;
  sourceLabel: string;
};

function getSourceLabel(card: Card): string {
  const s = (card.source || "").toLowerCase();
  if (s.includes("extension")) return "Side panel";
  if (s.includes("gmail") || s.includes("mail")) return "Gmail";
  if (s.includes("calendar")) return "Calendar";
  return card.source || "Saved";
}

function mapCardToResting(card: Card): RestingHereItem {
  let createdAtLabel = "Just now";
  if (card.created_at) {
    const created = new Date(card.created_at);
    const today = new Date();
    const isToday =
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate();
    createdAtLabel = isToday
      ? "Added today"
      : created.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return {
    id: card.id,
    title: card.title || "Untitled",
    body: card.body || "",
    createdAtLabel,
    sourceLabel: getSourceLabel(card),
  };
}

export default function CaptureUI() {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const hasSupabase = hasSupabaseConfig();
  const [dataStatus, setDataStatus] = useState<DataStatus>(
    hasSupabase ? "idle" : "ready",
  );
  const [restingItems, setRestingItems] = useState<RestingHereItem[]>([]);
  const [previewText, setPreviewText] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [guidanceSeen, setGuidanceSeen] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    hasAnrenGuidanceBeenSeen().then((seen) => setGuidanceSeen(seen));
  }, []);

  // Track Supabase auth state so we know when the user is signed in and can
  // hide the Account sign-in section.
  useEffect(() => {
    if (!hasSupabase) return;
    const supabase = getClient();
    if (!supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setUser(user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hasSupabase]);

  const isSubmitting = status === "saving";

  const statusMessage = useMemo(() => {
    if (status === "saving") return "I'm holding that for you…";
    if (status === "saved") return "Got it. I'll keep this safe.";
    return "You don't have to phrase it perfectly. Just tell me what's on your mind.";
  }, [status]);

  useEffect(() => {
    const chromeAny = (window as unknown as { chrome?: unknown }).chrome as
      | {
          storage?: {
            local?: {
              get: (
                keys: string | string[] | Record<string, unknown>,
                callback: (items: Record<string, unknown>) => void,
              ) => void;
              remove?: (keys: string | string[]) => void;
            };
          };
        }
      | undefined;

    if (!chromeAny?.storage?.local) return;

    chromeAny.storage.local.get("anren_panel_context", (items) => {
      const raw = items.anren_panel_context as
        | { pageTitle?: string; pageUrl?: string; selectedText?: string }
        | undefined;
      if (!raw) return;

      const { pageTitle, pageUrl, selectedText } = raw;
      if (selectedText && selectedText.trim()) {
        setNoteText(selectedText.trim());
        const context = [pageTitle, pageUrl].filter(Boolean).join("\n");
        if (context) {
          setPreviewText(context);
        }
      } else if (pageTitle || pageUrl) {
        setPreviewText([pageTitle, pageUrl].filter(Boolean).join("\n"));
      }
      if (pageUrl) setSourceUrl(pageUrl);
      if (pageTitle) setSourceTitle(pageTitle);

      if (chromeAny.storage?.local?.remove) {
        chromeAny.storage.local.remove("anren_panel_context");
      }
    });
  }, []);

  useEffect(() => {
    if (!hasSupabase) return;
    let cancelled = false;

    async function load() {
      const MIN_LOADING_MS = 2000;
      const startedAt = Date.now();
      try {
        setDataStatus("loading");
        const cards = await fetchRecentCards(20);
        const elapsed = Date.now() - startedAt;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (cancelled) return;
        setRestingItems(cards.map(mapCardToResting));
        setDataStatus("ready");
      } catch {
        if (cancelled) return;
        setRestingItems([]);
        setDataStatus("ready");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [hasSupabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const rawText = [previewText, noteText.trim()].filter(Boolean).join("\n\n");
    if (!rawText.trim()) return;

    setStatus("saving");
    setSaveError(null);

    // Get user ID from session
    const supabase = getClient();
    let userId = "anonymous";
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    const timestamp = new Date().toISOString();

    try {
      await callIntakeApi({
        userId,
        rawText: rawText.trim(),
        source: "chrome_side_panel",
        timestamp,
      });
    } catch {
      // Swallow; we persist via createCard below.
    }

    const [firstLine, ...rest] = rawText.trim().split("\n");
    const title = firstLine.trim() || "Untitled note";
    let body = rest.join("\n").trim();
    if (sourceUrl || sourceTitle) {
      body = [body, [sourceTitle, sourceUrl].filter(Boolean).join(" ")].filter(Boolean).join("\n\n");
    }

    const created = await createCard({
      title,
      body,
      summary: body.slice(0, 200) || title,
    });

    if (created) {
      setRestingItems((current) => [mapCardToResting(created), ...current]);
      setStatus("saved");
      setPreviewText("");
      setSourceUrl(null);
      setSourceTitle(null);
      setNoteText("");
      window.setTimeout(() => setStatus("idle"), 1600);
    } else {
      setStatus("idle");
      setSaveError(
        hasSupabase
          ? "Couldn't save — check the browser console for details."
          : "Supabase isn't configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env and rebuild.",
      );
    }
  };

  const handleSignIn = () => {
    setAuthError(null);
    const url = getWebAppAuthUrl();
    try {
      const chromeAny = globalThis as unknown as { chrome?: { tabs?: { create: (opts: { url: string }) => void } } };
      if (chromeAny.chrome?.tabs?.create) {
        chromeAny.chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank");
      }
    } catch {
      setAuthError("Could not open sign-in page.");
    }
    setSigningIn(false);
  };

  return (
    <>
      <header className="anren-panel-header">
        <div className="anren-panel-title">
          <span className="anren-panel-title-label">Anren</span>
        </div>
      </header>

      <main className="anren-panel-main">
        {hasSupabase && !user && (
          <section className="anren-section">
            <div className="anren-section-header">
              <span className="anren-section-title">Account</span>
            </div>
            <button
              type="button"
              className="capture-button"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              Sign in with Google
            </button>
            <p className="capture-status capture-muted" style={{ marginTop: 6, fontSize: 12 }}>
              Opens the Anren app in a new tab. After signing in there, return here.
            </p>
            {authError && (
              <p className="capture-status capture-error" role="alert">
                {authError}
              </p>
            )}
          </section>
        )}
        {dataStatus === "ready" && restingItems.length === 0 && !guidanceSeen && (
          <section className="anren-section anren-guidance-section">
            <AnrenGuidanceTooltips
              isOpen={true}
              onClose={() => setGuidanceSeen(true)}
            />
          </section>
        )}

        <section className="anren-section anren-intake-section">
          <div className="anren-section-header">
            <span className="anren-section-title">Intake</span>
          </div>
          <form className="capture-form" onSubmit={handleSubmit}>
            <div className="intake-preview">
              {previewText ? (
                <p className="intake-preview-text">{previewText}</p>
              ) : (
                <p className="intake-preview-placeholder">
                  Open from Gmail or Calendar and use the Anren icon to capture
                  a selection or the page.
                </p>
              )}
            </div>
            <label htmlFor="intake-note" className="visually-hidden">
              Add a note
            </label>
            <textarea
              id="intake-note"
              className="intake-note-input"
              placeholder="Add a note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
            <button
              type="submit"
              className="capture-button capture-button-primary"
              disabled={isSubmitting || !(previewText.trim() || noteText.trim())}
            >
              Hold this
            </button>
            {saveError && (
              <p className="capture-status capture-error" role="alert">
                {saveError}
              </p>
            )}
            <p className="capture-status">{statusMessage}</p>
            {!hasSupabase && (
              <p className="capture-status anren-supabase-notice">
                Supabase not configured — items won't be saved until you add
                VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and rebuild.
              </p>
            )}
          </form>
        </section>

        <section className="anren-section">
          <div className="anren-section-header">
            <span className="anren-section-title">Resting here</span>
          </div>
          <ul className="task-list">
            {restingItems.map((item) => (
              <li key={item.id} className="task-card resting-item">
                <div className="task-title-row">
                  <span className="task-title">{item.title}</span>
                  <span className="resting-item-source">{item.sourceLabel}</span>
                  <span
                    className="resting-item-calendar"
                    title="Coming soon"
                    aria-hidden
                  >
                    📅
                  </span>
                </div>
                {item.body ? (
                  <p className="task-subcopy">{item.body}</p>
                ) : null}
                <div className="task-meta-row">
                  <span className="task-due">{item.createdAtLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {hasSupabase && dataStatus === "loading" && (
          <p className="reassuring-text">
            Gathering what you&apos;re already holding…
          </p>
        )}
      </main>
    </>
  );
}
