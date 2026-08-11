import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startLiveSpeech } from "@/lib/speech";
import {
  appendSegment,
  clearSession,
  readSegments,
  saveSession,
  type RecordingSession,
} from "@/lib/recordingStore";
import { finishSession, uploadAudio } from "@/lib/recordingFinish";
import { toast } from "sonner";

type RecorderStatus = "idle" | "recording" | "saving";

interface RecorderValue {
  status: RecorderStatus;
  elapsed: number;
  liveText: string;
  level: number;
  start: (projectId?: string | null) => Promise<void>;
  stop: () => Promise<string | null>;
  cancel: () => void;
}

const RecorderContext = createContext<RecorderValue | undefined>(undefined);

/** How often the samples in memory are written to the device. */
const FLUSH_MS = 5000;
/** How often the audio so far is pushed to the server as a safety net. */
const SNAPSHOT_MS = 30000;

export function RecorderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const stopLiveRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  const sessionRef = useRef<RecordingSession | null>(null);
  const segmentIndexRef = useRef(0);
  const elapsedRef = useRef(0);
  const liveTextRef = useRef("");
  const lastSnapshotRef = useRef(0);
  const flushingRef = useRef(false);

  const teardownAudio = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (flushTimerRef.current) window.clearInterval(flushTimerRef.current);
    timerRef.current = null;
    flushTimerRef.current = null;
    stopLiveRef.current?.();
    stopLiveRef.current = null;
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => undefined);
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    setLevel(0);
  }, []);

  /** Move whatever is in memory onto the device, and keep the session fresh. */
  const flush = useCallback(async (): Promise<void> => {
    const session = sessionRef.current;
    if (!session || flushingRef.current) return;
    flushingRef.current = true;
    try {
      const pending = chunksRef.current;
      chunksRef.current = [];
      if (pending.length) {
        const total = pending.reduce((n, c) => n + c.length, 0);
        const merged = new Float32Array(total);
        let offset = 0;
        for (const chunk of pending) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        await appendSegment(session.sessionId, segmentIndexRef.current, merged);
        segmentIndexRef.current += 1;
      }
      session.elapsed = elapsedRef.current;
      session.liveText = liveTextRef.current;
      session.segmentCount = segmentIndexRef.current;
      await saveSession({ ...session });
    } finally {
      flushingRef.current = false;
    }
  }, []);

  /** Push the audio so far to storage, so a lost device still has the thought. */
  const snapshot = useCallback(async () => {
    const session = sessionRef.current;
    if (!session?.noteId) return;
    const segments = await readSegments(session.sessionId);
    if (!segments.length) return;
    const bytes = segments.reduce((n, s) => n + s.length, 0) * 2;
    if (bytes > 12 * 1024 * 1024) return; // long recordings ride on the local copy
    const path = await uploadAudio(session.userId, session.noteId, segments, session.sampleRate);
    if (path) {
      session.uploaded = true;
      await supabase.from("notes").update({ audio_path: path }).eq("id", session.noteId);
    }
  }, []);

  useEffect(() => () => teardownAudio(), [teardownAudio]);

  const start = useCallback(
    async (projectId?: string | null) => {
      if (status !== "idle" || !user) return;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast.error("Anren needs microphone access to listen.");
        return;
      }

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      segmentIndexRef.current = 0;
      elapsedRef.current = 0;
      liveTextRef.current = "";
      lastSnapshotRef.current = Date.now();
      setLiveText("");
      setElapsed(0);

      const session: RecordingSession = {
        sessionId: crypto.randomUUID(),
        noteId: null,
        projectId: projectId ?? null,
        userId: user.id,
        startedAt: Date.now(),
        sampleRate: ctx.sampleRate,
        elapsed: 0,
        liveText: "",
        segmentCount: 0,
        state: "recording",
        uploaded: false,
      };
      sessionRef.current = session;
      await saveSession(session);

      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
        let peak = 0;
        for (let i = 0; i < input.length; i += 64) peak = Math.max(peak, Math.abs(input[i]));
        setLevel(peak);
      };
      source.connect(node);
      node.connect(ctx.destination);

      streamRef.current = stream;
      ctxRef.current = ctx;
      sourceRef.current = source;
      nodeRef.current = node;

      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
      } catch {
        /* wake lock unavailable */
      }

      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);

      flushTimerRef.current = window.setInterval(() => {
        void flush().then(() => {
          if (Date.now() - lastSnapshotRef.current >= SNAPSHOT_MS) {
            lastSnapshotRef.current = Date.now();
            void snapshot();
          }
        });
      }, FLUSH_MS);

      // On-device recognition for the words on screen — free, and instant.
      stopLiveRef.current = startLiveSpeech((text) => {
        liveTextRef.current = text;
        setLiveText(text);
      });
      setStatus("recording");

      // The note exists from the first word, so nothing is orphaned later.
      const { data } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          project_id: projectId ?? null,
          duration_seconds: 0,
          status: "processing",
        })
        .select("id")
        .single();
      if (data && sessionRef.current?.sessionId === session.sessionId) {
        sessionRef.current.noteId = data.id as string;
        await saveSession({ ...sessionRef.current });
      }
    },
    [status, user, flush, snapshot],
  );

  const cancel = useCallback(() => {
    teardownAudio();
    const session = sessionRef.current;
    sessionRef.current = null;
    chunksRef.current = [];
    setLiveText("");
    setElapsed(0);
    setStatus("idle");
    if (session) {
      void clearSession(session.sessionId);
      if (session.noteId) {
        void supabase
          .from("notes")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", session.noteId);
      }
    }
  }, [teardownAudio]);

  const stop = useCallback(async (): Promise<string | null> => {
    const session = sessionRef.current;
    if (status !== "recording" || !user || !session) return null;
    setStatus("saving");

    await flush();
    teardownAudio();

    session.state = "finishing";
    session.elapsed = elapsedRef.current;
    await saveSession({ ...session });

    const segments = await readSegments(session.sessionId);
    const samples = segments.reduce((n, s) => n + s.length, 0);

    if (samples < 8000) {
      toast.error("That was too quiet to keep. Try again?");
      if (session.noteId) {
        await supabase
          .from("notes")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", session.noteId);
      }
      await clearSession(session.sessionId);
      sessionRef.current = null;
      setStatus("idle");
      return null;
    }

    const noteId = await finishSession(session, segments);
    if (!noteId) toast.error("Couldn't save that note.");

    await clearSession(session.sessionId);
    sessionRef.current = null;
    setStatus("idle");
    setElapsed(0);
    setLiveText("");
    return noteId;
  }, [status, user, flush, teardownAudio]);

  // Interruptions — a lock screen, a call, a switch to another app. Get the
  // samples onto the device immediately, and pick the mic back up on return.
  useEffect(() => {
    const onHide = () => {
      if (!sessionRef.current) return;
      sessionRef.current.state = "interrupted";
      void flush();
    };

    const onVisible = async () => {
      if (document.visibilityState !== "visible" || !sessionRef.current) return;
      sessionRef.current.state = "recording";
      const ctx = ctxRef.current;
      if (ctx?.state === "suspended") await ctx.resume().catch(() => undefined);
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && !wakeLockRef.current) {
          wakeLockRef.current = await nav.wakeLock.request("screen");
        }
      } catch {
        /* wake lock unavailable */
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onHide();
      else void onVisible();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("freeze", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("freeze", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [flush]);

  return (
    <RecorderContext.Provider value={{ status, elapsed, liveText, level, start, stop, cancel }}>
      {children}
    </RecorderContext.Provider>
  );
}

export function useRecorder() {
  const ctx = useContext(RecorderContext);
  if (!ctx) throw new Error("useRecorder must be used inside RecorderProvider");
  return ctx;
}
