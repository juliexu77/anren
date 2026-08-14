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
import { finishSession, requestWriteUp } from "@/lib/recordingFinish";
import { useRecorder } from "@/contexts/RecorderContext";

const STALLED_MS = 3 * 60 * 1000;
const ABANDONED_MS = 30 * 60 * 1000;

/**
 * Notes whose audio reached the server but whose write-up never got kicked off
 * — the tab closed at exactly the wrong moment. Nudge them along quietly.
 */
async function resumeStalledNotes(userId: string): Promise<void> {
  const { data } = await supabase
    .from("notes")
    .select("id, audio_path, created_at")
    .eq("user_id", userId)
    .eq("source", "voice")
    .eq("status", "processing")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const note of data ?? []) {
    const age = Date.now() - new Date(note.created_at as string).getTime();
    if (age < STALLED_MS) continue;
    if (note.audio_path) {
      requestWriteUp(note.id as string);
    } else if (age > ABANDONED_MS) {
      // No audio ever arrived, so there's no note here to show anyone — let it
      // go quietly rather than leaving an untitled shell in the feed.
      await supabase
        .from("notes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", note.id);
    }
  }
}

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
      void resumeStalledNotes(user.id);
      // Recordings are a means to the words — drop any audio already written up.
      void supabase.functions.invoke("purge-audio");

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
    const { noteId, saved } = await finishSession(session, segments);
    // Hold on to the device copy if the audio still hasn't reached the server.
    if (saved) await clearSession(session.sessionId);
    if (saved) setSession(null);
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
