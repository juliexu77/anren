import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HomeCaptureLine } from "@/components/HomeCaptureLine";
import { StarterPrompts } from "@/components/StarterPrompts";

import { useRecordingRecovery } from "@/hooks/useRecordingRecovery";
import { supabase } from "@/integrations/supabase/client";
import { notesChanged } from "@/lib/noteEvents";

/** How long the quiet confirmation lingers before the page goes blank again. */
const CONFIRM_MS = 4200;
/** A filing guess is worth leaving up a little longer, in case it's wrong. */
const FILED_MS = 9000;

interface KeptState {
  kept?: string;
  filedInto?: string | null;
  filedIntoName?: string | null;
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
  const [filed, setFiled] = useState<{ id: string; name: string } | null>(
    state?.filedInto && state?.filedIntoName
      ? { id: state.filedInto, name: state.filedIntoName }
      : null,
  );

  useEffect(() => {
    if (keptFromState) setKept(keptFromState);
    if (state?.filedInto && state?.filedIntoName) {
      setFiled({ id: state.filedInto, name: state.filedIntoName });
    }
  }, [keptFromState, state?.filedInto, state?.filedIntoName]);

  useEffect(() => {
    if (!kept) return;
    const t = window.setTimeout(() => {
      setKept(null);
      setFiled(null);
    }, filed ? FILED_MS : CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [kept, filed]);

  /** A guess should never cost more than one tap to undo. */
  const notThat = async () => {
    if (!kept) return;
    setFiled(null);
    await supabase.from("notes").update({ project_id: null, auto_filed_at: null }).eq("id", kept);
    notesChanged();
  };

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
          <div className="motion-safe:animate-fade-in">
            <p className="text-[0.95rem] text-muted-foreground">
              Kept it.{" "}
              <Link
                to={`/note/${kept}`}
                className="italic underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
              >
                open it
              </Link>
            </p>
            {filed && (
              <p className="mt-1 text-[0.82rem] text-muted-foreground/75">
                Filed into{" "}
                <Link
                  to={`/folder/${filed.id}`}
                  className="underline decoration-hairline underline-offset-[3px] transition-colors hover:text-foreground"
                >
                  {filed.name}
                </Link>
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                <button
                  onClick={notThat}
                  className="italic underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
                >
                  not that?
                </button>
              </p>
            )}
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
