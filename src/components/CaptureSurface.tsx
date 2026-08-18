import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HomeCaptureLine } from "@/components/HomeCaptureLine";
import { StarterPrompts } from "@/components/StarterPrompts";
import { KeptEcho } from "@/components/KeptEcho";

import { useRecordingRecovery } from "@/hooks/useRecordingRecovery";

/** How long what anren said back stays up before the page goes blank again. */
const CONFIRM_MS = 12000;

interface KeptState {
  kept?: string;
}

/**
 * The blank page: one soft line and two ways in — speak it, or write it.
 * Both open their own focused capture state; nothing is composed here.
 */
export function CaptureSurface() {
  const { session: recovered, busy, keep, discard } = useRecordingRecovery();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as KeptState | null) ?? null;
  const keptFromState = state?.kept ?? null;
  const [kept, setKept] = useState<string | null>(keptFromState);
  const [linger, setLinger] = useState(0);

  useEffect(() => {
    if (keptFromState) setKept(keptFromState);
  }, [keptFromState]);

  useEffect(() => {
    if (!kept) return;
    const t = window.setTimeout(() => setKept(null), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [kept, linger]);

  // A late line shouldn't get cut off a moment after it appears.
  const holdLonger = useCallback(() => setLinger((n) => n + 1), []);


  return (
    <div className="w-full">
      {recovered && (
        <div className="mb-6 rounded-[18px] border border-hairline bg-paper px-5 py-4 animate-fade-up">
          <p className="text-[0.92rem] leading-[1.6]">
            You were part-way through something — keep it?
          </p>
          {recovered.liveText && (
            <p className="mt-1.5 text-[0.85rem] leading-[1.6] text-muted-foreground line-clamp-2">
              {recovered.liveText}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={async () => {
                const noteId = await keep();
                if (noteId) navigate(`/note/${noteId}`);
              }}
              disabled={busy}
              className="text-[0.85rem] text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {busy ? "Keeping…" : "Keep it"}
            </button>
            <button
              onClick={() => void discard()}
              disabled={busy}
              className="text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="min-h-[3.5rem] text-center">
        {kept ? (
          <div onClick={() => setKept(null)}>
            <KeptEcho noteId={kept} onSomethingNew={holdLonger} />
          </div>
        ) : (
          <>
            <HomeCaptureLine />
            <StarterPrompts surface="home" className="mt-7 max-w-[380px] mx-auto" />
          </>
        )}


      </div>
    </div>
  );
}
