import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  clearSession,
  findUnfinishedSession,
  pruneStaleSessions,
  readSegments,
  type RecordingSession,
} from "@/lib/recordingStore";
import { finishSession } from "@/lib/recordingFinish";
import { useRecorder } from "@/contexts/RecorderContext";

/**
 * Offers back a recording that never got to finish — the screen locked, the
 * app was reloaded, the phone rang. The samples are already on the device.
 */
export function useRecordingRecovery() {
  const { user } = useAuth();
  const { status } = useRecorder();
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || status !== "idle") return;
    let cancelled = false;
    void (async () => {
      await pruneStaleSessions();
      const found = await findUnfinishedSession(user.id);
      if (cancelled || !found) return;
      const segments = await readSegments(found.sessionId);
      const samples = segments.reduce((n, s) => n + s.length, 0);
      if (samples < 8000) {
        await clearSession(found.sessionId);
        return;
      }
      if (!cancelled) setSession(found);
    })();
    return () => {
      cancelled = true;
    };
    // Only look once per sign-in; recording sessions clear themselves on stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const keep = useCallback(async (): Promise<string | null> => {
    if (!session || busy) return null;
    setBusy(true);
    const segments = await readSegments(session.sessionId);
    const noteId = await finishSession(session, segments);
    await clearSession(session.sessionId);
    setSession(null);
    setBusy(false);
    return noteId;
  }, [session, busy]);

  const discard = useCallback(async () => {
    if (!session) return;
    if (session.noteId) {
      await supabase
        .from("notes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", session.noteId);
    }
    await clearSession(session.sessionId);
    setSession(null);
  }, [session]);

  return { session, busy, keep, discard };
}
