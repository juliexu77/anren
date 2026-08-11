import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { encodeWav } from "@/lib/wav";
import { startLiveSpeech } from "@/lib/speech";
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
  const stopLiveRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const projectRef = useRef<string | null>(null);

  const teardown = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
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

  useEffect(() => teardown, [teardown]);

  const start = useCallback(
    async (projectId?: string | null) => {
      if (status !== "idle") return;
      projectRef.current = projectId ?? null;
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
      setLiveText("");
      setElapsed(0);

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

      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
      // On-device recognition for the words on screen — free, and instant.
      stopLiveRef.current = startLiveSpeech(setLiveText);
      setStatus("recording");
    },
    [status],
  );

  const cancel = useCallback(() => {
    teardown();
    chunksRef.current = [];
    setLiveText("");
    setElapsed(0);
    setStatus("idle");
  }, [teardown]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (status !== "recording" || !user) return null;
    setStatus("saving");

    const sampleRate = ctxRef.current?.sampleRate ?? 48000;
    const chunks = chunksRef.current;
    const seconds = elapsed;
    teardown();

    const blob = encodeWav(chunks, sampleRate);
    chunksRef.current = [];

    if (blob.size < 4096) {
      toast.error("That was too quiet to keep. Try again?");
      setStatus("idle");
      return null;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        project_id: projectRef.current,
        duration_seconds: seconds,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      toast.error("Couldn't save that note.");
      setStatus("idle");
      return null;
    }

    const noteId = inserted.id as string;
    const path = `${user.id}/${noteId}.wav`;

    const { error: uploadError } = await supabase.storage
      .from("voice-notes")
      .upload(path, blob, { contentType: "audio/wav", upsert: true });

    if (uploadError) {
      await supabase
        .from("notes")
        .update({ status: "failed", error_message: "Audio upload failed" })
        .eq("id", noteId);
      toast.error("Couldn't upload the audio.");
      setStatus("idle");
      return noteId;
    }

    await supabase.from("notes").update({ audio_path: path }).eq("id", noteId);

    supabase.functions.invoke("process-note", { body: { noteId } }).then(({ error }) => {
      if (error) console.error("process-note failed:", error.message);
    });

    setStatus("idle");
    setElapsed(0);
    setLiveText("");
    return noteId;
  }, [status, user, elapsed, teardown]);

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
