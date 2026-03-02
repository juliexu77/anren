import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AnrenGuidanceTooltips,
  hasAnrenGuidanceBeenSeen,
} from "./components/AnrenGuidanceTooltips";
import { callIntakeApi } from "./shared/intakeApi";
import {
  createIntakeFallback,
  createTasks,
  fetchRecentIntakeItems,
  hasSupabaseConfig,
  type IntakeItem,
  type Task as SupabaseTask,
} from "./shared/supabaseClient";
import { getCurrentUserId } from "./shared/config";
import "./App.css";

type CaptureStatus = "idle" | "saving" | "saved";
type DataStatus = "idle" | "loading" | "ready";

type RestingHereItem = {
  id: string;
  title: string;
  body: string;
  createdAtLabel: string;
  sourceLabel: string;
};

/** Tiny source label for display: gmail, calendar, or domain. */
function getSourceLabel(item: IntakeItem): string {
  const url = item.source_url || "";
  const title = (item.source_title || "").toLowerCase();
  if (url.includes("mail.google.com") || title.includes("gmail") || title.includes("inbox"))
    return "Gmail";
  if (url.includes("calendar.google.com") || title.includes("calendar"))
    return "Calendar";
  if (url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return host.split(".").slice(-2).join(".") || "Saved";
    } catch {
      return "Saved";
    }
  }
  return "Side panel";
}

function mapIntakeToResting(item: IntakeItem): RestingHereItem {
  const raw = item.raw_text || "";
  const [firstLine, ...rest] = raw.split("\n");
  const title = firstLine.trim() || "Untitled note";
  const body = rest.join("\n").trim() || raw;

  let createdAtLabel = "Just now";
  if (item.created_at) {
    const created = new Date(item.created_at);
    const today = new Date();
    const isToday =
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate();
    if (isToday) {
      createdAtLabel = "Added today";
    } else {
      createdAtLabel = created.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
  }

  return {
    id: item.id,
    title,
    body,
    createdAtLabel,
    sourceLabel: getSourceLabel(item),
  };
}

function App() {
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

  useEffect(() => {
    hasAnrenGuidanceBeenSeen().then((seen) => setGuidanceSeen(seen));
  }, []);

  const isSubmitting = status === "saving";

  const statusMessage = useMemo(() => {
    if (status === "saving") {
      return "I’m holding that for you…";
    }
    if (status === "saved") {
      return "Got it. I’ll keep this safe.";
    }
    return "You don’t have to phrase it perfectly. Just tell me what’s on your mind.";
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

    if (!chromeAny?.storage?.local) {
      return;
    }

    chromeAny.storage.local.get("anren_panel_context", (items) => {
      const raw = items.anren_panel_context as
        | {
            pageTitle?: string;
            pageUrl?: string;
            selectedText?: string;
          }
        | undefined;

      if (!raw) return;

      const { pageTitle, pageUrl, selectedText } = raw;

      if (selectedText && selectedText.trim()) {
        setPreviewText(selectedText.trim());
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
    const userId = getCurrentUserId();

    async function load() {
      try {
        setDataStatus("loading");
        const intake = await fetchRecentIntakeItems(userId);
        if (cancelled) return;
        setRestingItems(intake.map(mapIntakeToResting));
        setDataStatus("ready");
      } catch {
        if (cancelled) return;
        setRestingItems([]);
        setDataStatus("ready");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [hasSupabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const rawText = [previewText, noteText.trim()].filter(Boolean).join("\n\n");
    if (!rawText.trim()) return;

    setStatus("saving");
    setSaveError(null);

    const userId = getCurrentUserId();
    const timestamp = new Date().toISOString();

    const sourceOptions =
      sourceUrl || sourceTitle
        ? {
            source_url: sourceUrl ?? undefined,
            source_title: sourceTitle ?? undefined,
          }
        : undefined;

    try {
      const apiResult = await callIntakeApi({
        userId,
        rawText: rawText.trim(),
        source: "chrome_side_panel",
        timestamp,
      });

      if ("tasks" in apiResult && apiResult.tasks.length > 0) {
        await createTasks(
          userId,
          apiResult.tasks as Omit<
            SupabaseTask,
            "id" | "user_id" | "created_at"
          >[],
        );
      }
    } catch {
      // Swallow intake API errors; we always fall back to storing the raw text.
    }

    const created = await createIntakeFallback(
      userId,
      rawText.trim(),
      sourceOptions,
    );

    if (created) {
      setRestingItems((current) => [mapIntakeToResting(created), ...current]);
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
          ? "Couldn’t save — check the browser console for details, and that your Supabase table and RLS policies allow inserts."
          : "Supabase isn’t configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env and rebuild.",
      );
    }
  };

  return (
    <div className="anren-panel">
      <header className="anren-panel-header">
        <div className="anren-panel-title">
          <span className="anren-panel-title-label">Anren</span>
        </div>
      </header>

      <main className="anren-panel-main">
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
                Supabase not configured — items won’t be saved until you add
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
    </div>
  );
}

export default App;
