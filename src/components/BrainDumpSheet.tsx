import { useState, useRef, useCallback, useEffect } from "react";
import { X, Mic, Square, Send, Check, Pencil, Loader2, Keyboard, Heart, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ItemType } from "@/types/card";

interface ExtractedItem {
  title: string;
  type: ItemType;
  theme: string;
  due_at?: string | null;
}

interface ReflectionResult {
  texture: string;
  texture_why: string;
  what_this_reveals: string;
  energy_givers: string[];
  energy_drainers: string[];
  unresolved_threads: string[];
  summary: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: ExtractedItem[]) => Promise<void>;
}

type Mode = "organize" | "reflect" | null;
type Phase = "mode-select" | "voice" | "transcribing" | "typing" | "processing" | "review" | "reflection-review";

export function BrainDumpSheet({ open, onClose, onConfirm }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [phase, setPhase] = useState<Phase>("mode-select");
  const [text, setText] = useState("");
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [reflectionResult, setReflectionResult] = useState<ReflectionResult | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const autoStartedRef = useRef(false);

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
  }, []);

  const handleClose = () => {
    cleanup();
    setMode(null);
    setPhase("mode-select");
    setText("");
    setItems([]);
    setReflectionResult(null);
    setEditingIdx(null);
    setMicError(false);
    autoStartedRef.current = false;
    onClose();
  };

  const selectMode = (m: Mode) => {
    setMode(m);
    setPhase("voice");
    autoStartedRef.current = false;
  };

  const startRecording = async () => {
    try {
      setMicError(false);
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

        setPhase("transcribing");

        const { data, error } = await supabase.functions.invoke("transcribe-voice", {
          body: { audioBase64: base64, mimeType: recorder.mimeType },
        });

        if (error || !data || data.error) {
          toast.error("Couldn't transcribe. Type instead?");
          setPhase("typing");
          return;
        }

        const transcript = data.body || data.text || "";
        setText(transcript);

        if (mode === "reflect") {
          await processReflection(transcript);
        } else {
          await processOrganize(transcript);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setMicError(true);
      setPhase("typing");
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    if (open && phase === "voice" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startRecording();
    }
  }, [open, phase]);

  const processOrganize = async (transcript: string) => {
    setPhase("processing");
    try {
      const { data, error } = await supabase.functions.invoke("process-brain-dump", {
        body: { text: transcript.trim() },
      });
      if (error || !data || data.error) {
        toast.error(data?.error || "Processing failed. Try again.");
        setPhase("typing");
        return;
      }
      setItems(data.items || []);
      setPhase("review");
    } catch {
      toast.error("Something went wrong");
      setPhase("typing");
    }
  };

  const processReflection = async (transcript: string) => {
    setPhase("processing");
    try {
      const { data, error } = await supabase.functions.invoke("process-reflection", {
        body: { transcript: transcript.trim() },
      });
      if (error || !data || data.error) {
        toast.error(data?.error || "Couldn't process reflection. Try again.");
        setPhase("typing");
        return;
      }
      setReflectionResult(data as ReflectionResult);
      setPhase("reflection-review");
    } catch {
      toast.error("Something went wrong");
      setPhase("typing");
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    if (mode === "reflect") {
      await processReflection(text);
    } else {
      await processOrganize(text);
    }
  };

  const handleConfirm = async () => {
    setPhase("processing");
    try {
      await onConfirm(items);
      toast.success("Everything's been captured");
      handleClose();
    } catch {
      toast.error("Failed to save");
      setPhase("review");
    }
  };

  const handleSaveReflection = async () => {
    if (!reflectionResult || !user) return;
    setPhase("processing");
    try {
      const { error } = await supabase.from("reflections").insert({
        user_id: user.id,
        raw_transcript: text,
        texture: reflectionResult.texture,
        texture_why: reflectionResult.texture_why,
        what_this_reveals: reflectionResult.what_this_reveals,
        energy_givers: reflectionResult.energy_givers,
        energy_drainers: reflectionResult.energy_drainers,
        unresolved_threads: reflectionResult.unresolved_threads,
        summary: reflectionResult.summary,
      } as any);
      if (error) throw error;
      toast.success("Reflection saved");
      handleClose();
    } catch {
      toast.error("Failed to save reflection");
      setPhase("reflection-review");
    }
  };

  const updateItem = (idx: number, updates: Partial<ExtractedItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  if (!open) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  const TYPE_LABELS: Record<ItemType, string> = { task: "One-time", ongoing: "Ongoing", event: "Event" };

  const timeSensitive = items.filter((i) => i.due_at);
  const oneTime = items.filter((i) => !i.due_at && i.type === "task");
  const ongoing = items.filter((i) => i.type === "ongoing");
  const events = items.filter((i) => !i.due_at && i.type === "event");

  const headerLabel = phase === "mode-select"
    ? "Clear your mind"
    : phase === "voice"
    ? (mode === "reflect" ? "How am I doing" : "Speak freely")
    : phase === "transcribing"
    ? "Listening…"
    : phase === "typing"
    ? (mode === "reflect" ? "How am I doing" : "Set it down")
    : phase === "processing"
    ? (mode === "reflect" ? "Reflecting…" : "Processing")
    : phase === "reflection-review"
    ? "Your reflection"
    : "What I'm holding";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-color">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <button onClick={handleClose} className="p-2 -ml-2">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="text-label uppercase tracking-widest text-text-muted-color">
          {headerLabel}
        </span>
        <div className="w-9" />
      </div>

      {/* ── MODE SELECT PHASE ── */}
      {phase === "mode-select" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 pb-6">
          <p className="text-caption text-text-muted-color text-center mb-2">
            What brings you here?
          </p>

          <button
            onClick={() => selectMode("organize")}
            className="sanctuary-btn w-full max-w-[280px] flex items-center gap-3 px-5 py-4 text-left"
          >
            <ListChecks className="w-5 h-5 text-accent-1 shrink-0" />
            <div>
              <span className="text-button text-text-primary block">Get organized</span>
              <span className="text-micro text-text-muted-color">Clear what's on your mind</span>
            </div>
          </button>

          <button
            onClick={() => selectMode("reflect")}
            className="sanctuary-btn w-full max-w-[280px] flex items-center gap-3 px-5 py-4 text-left"
          >
            <Heart className="w-5 h-5 text-accent-1 shrink-0" />
            <div>
              <span className="text-button text-text-primary block">How am I doing</span>
              <span className="text-micro text-text-muted-color">Reflect on how the day feels</span>
            </div>
          </button>
        </div>
      )}

      {/* ── VOICE PHASE ── */}
      {phase === "voice" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-6">
          <p className="text-body-sm text-text-muted-color text-center">
            {mode === "reflect"
              ? "Talk about how your day is going."
              : "Say everything that's on your mind."}
          </p>

          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
              isRecording ? "bg-accent-1/20" : "bg-surface-color/50"
            }`}>
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-accent-1/10 animate-ping" />
              )}
              <Mic className={`w-10 h-10 ${isRecording ? "text-accent-1" : "text-text-primary/60"}`} />
            </div>
          </div>

          {isRecording && (
            <span className="text-2xl font-mono text-text-primary/80 tabular-nums">{timeStr}</span>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors bg-accent-1/10 border border-accent-1/20 text-accent-1"
            >
              <Square className="w-4 h-4 fill-current" />
              <span className="text-button-sm">Done speaking</span>
            </button>
          )}

          <button
            onClick={() => { cleanup(); setPhase("typing"); }}
            className="text-button-sm text-text-muted-color underline underline-offset-2"
          >
            <Keyboard className="w-3.5 h-3.5 inline mr-1.5" />
            Type instead
          </button>
        </div>
      )}

      {/* ── TRANSCRIBING PHASE ── */}
      {phase === "transcribing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
          <Loader2 className="w-8 h-8 animate-spin text-accent-1" />
          <p className="text-caption text-text-muted-color">
            Transcribing what you said…
          </p>
        </div>
      )}

      {/* ── TYPING PHASE ── */}
      {phase === "typing" && (
        <div className="flex-1 flex flex-col px-5 pb-6">
          <p className="text-caption mb-3 text-text-muted-color">
            {mode === "reflect"
              ? "How is your day going? What's the texture of it?"
              : text
              ? "Review or add more, then let go."
              : "What's weighing on you…"}
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "reflect" ? "How am I really doing…" : "What's weighing on you…"}
            className="flex-1 w-full resize-none rounded-lg px-4 py-3 text-body-sm focus:outline-none"
            style={{ minHeight: "200px" }}
            autoFocus
          />

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => { setPhase("voice"); autoStartedRef.current = false; }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors bg-surface-color border border-divider-color/30 text-text-secondary-color"
            >
              <Mic className="w-4 h-4" />
              <span className="text-button-sm">Speak</span>
            </button>

            <div className="flex-1" />

            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="accent-btn flex items-center gap-2 px-5 py-2.5 text-button-sm disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
              {mode === "reflect" ? "Reflect" : "Let go"}
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING PHASE ── */}
      {phase === "processing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
          <Loader2 className="w-8 h-8 animate-spin text-accent-1" />
          <p className="text-caption text-text-muted-color">
            {mode === "reflect" ? "Reflecting on what you shared…" : "Sorting through everything…"}
          </p>
        </div>
      )}

      {/* ── REFLECTION REVIEW PHASE ── */}
      {phase === "reflection-review" && reflectionResult && (
        <div className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
          {/* Texture heading */}
          <div className="text-center py-4">
            <p className="text-micro uppercase tracking-wider text-text-muted-color mb-1">
              Today's texture
            </p>
            <p className="font-display text-xl italic text-text-primary">
              "{reflectionResult.texture}"
            </p>
          </div>

          <div className="sanctuary-card px-4 py-4 space-y-4">
            <div>
              <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">Why</h4>
              <p className="text-caption text-text-secondary-color">{reflectionResult.texture_why}</p>
            </div>

            <div>
              <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">What this reveals</h4>
              <p className="text-caption text-text-secondary-color italic">{reflectionResult.what_this_reveals}</p>
            </div>

            {reflectionResult.energy_givers.length > 0 && (
              <div>
                <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">Energy givers</h4>
                <ul className="space-y-0.5">
                  {reflectionResult.energy_givers.map((g, i) => (
                    <li key={i} className="text-caption text-text-secondary-color">+ {g}</li>
                  ))}
                </ul>
              </div>
            )}

            {reflectionResult.energy_drainers.length > 0 && (
              <div>
                <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">Energy drainers</h4>
                <ul className="space-y-0.5">
                  {reflectionResult.energy_drainers.map((d, i) => (
                    <li key={i} className="text-caption text-text-secondary-color">− {d}</li>
                  ))}
                </ul>
              </div>
            )}

            {reflectionResult.unresolved_threads.length > 0 && (
              <div>
                <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">Unresolved threads</h4>
                <ul className="space-y-0.5">
                  {reflectionResult.unresolved_threads.map((t, i) => (
                    <li key={i} className="text-caption text-text-secondary-color">◦ {t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4">
            <button
              onClick={handleSaveReflection}
              className="accent-btn w-full py-3 text-button"
            >
              <Check className="w-4 h-4 inline mr-2" />
              Save reflection
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2.5 mt-2 rounded-lg text-button-sm transition-colors text-text-muted-color"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── ORGANIZE REVIEW PHASE ── */}
      {phase === "review" && (
        <div className="flex-1 flex flex-col px-5 pb-6 overflow-y-auto">
          <p className="text-body-sm mb-4 text-text-secondary-color">
            Here's what I'm holding for you.
          </p>

          {timeSensitive.length > 0 && (
            <ReviewSection label="Time-sensitive" items={timeSensitive} allItems={items} editingIdx={editingIdx} onEdit={setEditingIdx} onUpdate={updateItem} onRemove={removeItem} />
          )}
          {oneTime.length > 0 && (
            <ReviewSection label="One-time actions" items={oneTime} allItems={items} editingIdx={editingIdx} onEdit={setEditingIdx} onUpdate={updateItem} onRemove={removeItem} />
          )}
          {ongoing.length > 0 && (
            <ReviewSection label="Ongoing responsibilities" items={ongoing} allItems={items} editingIdx={editingIdx} onEdit={setEditingIdx} onUpdate={updateItem} onRemove={removeItem} />
          )}
          {events.length > 0 && (
            <ReviewSection label="Open loops" items={events} allItems={items} editingIdx={editingIdx} onEdit={setEditingIdx} onUpdate={updateItem} onRemove={removeItem} />
          )}

          {items.length === 0 && (
            <p className="text-caption py-8 text-center text-text-muted-color">
              Nothing extracted. Try adding more detail.
            </p>
          )}

          <div className="mt-auto pt-4">
            <button
              onClick={handleConfirm}
              disabled={items.length === 0}
              className="accent-btn w-full py-3 text-button disabled:opacity-30"
            >
              <Check className="w-4 h-4 inline mr-2" />
              Confirm — {items.length} item{items.length !== 1 ? "s" : ""}
            </button>
            <button
              onClick={() => { setPhase("typing"); setItems([]); }}
              className="w-full py-2.5 mt-2 rounded-lg text-button-sm transition-colors text-text-muted-color"
            >
              Back to editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Review Section ── */
function ReviewSection({
  label,
  items,
  allItems,
  editingIdx,
  onEdit,
  onUpdate,
  onRemove,
}: {
  label: string;
  items: ExtractedItem[];
  allItems: ExtractedItem[];
  editingIdx: number | null;
  onEdit: (idx: number | null) => void;
  onUpdate: (idx: number, updates: Partial<ExtractedItem>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-label uppercase tracking-wider mb-1.5 text-text-muted-color">
        {label}
      </h3>
      <div className="rounded-lg overflow-hidden bg-card-bg-color/50 border border-divider-color/20">
        {items.map((item) => {
          const globalIdx = allItems.indexOf(item);
          const isEditing = editingIdx === globalIdx;

          return (
            <div key={globalIdx} className="item-row">
              {isEditing ? (
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => onUpdate(globalIdx, { title: e.target.value })}
                  onBlur={() => onEdit(null)}
                  onKeyDown={(e) => e.key === "Enter" && onEdit(null)}
                  className="flex-1 text-caption px-2 py-1 rounded"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-caption truncate text-text-primary">
                  {item.title}
                </span>
              )}

              <span className="text-micro px-1.5 py-0.5 rounded shrink-0 bg-surface-color text-text-muted-color">
                {item.theme}
              </span>

              <button onClick={() => onEdit(isEditing ? null : globalIdx)} className="p-1 shrink-0">
                <Pencil className="w-3 h-3 text-text-muted-color" />
              </button>

              <button onClick={() => onRemove(globalIdx)} className="p-1 shrink-0">
                <X className="w-3 h-3 text-text-muted-color" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
