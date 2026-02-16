import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onRecordingComplete: (audioBase64: string, mimeType: string) => void;
}

export function VoiceRecorder({ open, onClose, onRecordingComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsed(0);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) cleanup();
  }, [open, cleanup]);

  const startRecording = async () => {
    try {
      setError(null);
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
        // Convert to base64 in chunks to avoid call stack issues
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
        }
        const base64 = btoa(binary);
        onRecordingComplete(base64, recorder.mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Microphone access denied. Check browser permissions.");
      } else {
        setError("Could not start recording.");
        console.error("Recording error:", err);
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  };

  if (!open) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(var(--bg) / 0.9)" }}>
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-6 min-w-[280px]"
        style={{
          background: "hsl(var(--card-bg) / 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid hsl(var(--divider) / 0.3)",
        }}
      >
        {/* Close */}
        <button onClick={() => { cleanup(); onClose(); }} className="absolute top-4 right-4 text-muted-foreground">
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing mic indicator */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              isRecording ? "bg-destructive/20" : "bg-muted/30"
            }`}
          >
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-destructive/10 animate-ping" />
            )}
            <Mic className={`w-8 h-8 ${isRecording ? "text-destructive" : "text-foreground/60"}`} />
          </div>
        </div>

        {/* Timer */}
        <span className="text-2xl font-mono text-foreground/80 tabular-nums">{timeStr}</span>

        {/* Error */}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        {/* Controls */}
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 rounded-xl text-sm font-medium bg-foreground/10 hover:bg-foreground/15 text-foreground transition-colors"
          >
            Tap to Record
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 rounded-xl text-sm font-medium bg-destructive/15 hover:bg-destructive/25 text-destructive transition-colors flex items-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
