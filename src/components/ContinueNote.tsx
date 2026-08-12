import { useState } from "react";
import { Loader2, Mic, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecorder } from "@/contexts/RecorderContext";
import { isNeedsKeyError, NEEDS_KEY_MESSAGE } from "@/lib/aiAccess";
import type { Note } from "@/types/note";

/**
 * Carry on a note that's already been written up. Speaking hands the new audio
 * to the recorder with this note attached; typing appends straight to the words
 * already there. Either way the whole note is read over again afterwards.
 */
export function ContinueNote({ note, onDone }: { note: Note; onDone: () => void }) {
  const { status, start } = useRecorder();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const busy = saving || status !== "idle";

  const speak = async () => {
    if (status !== "idle") return;
    await start(note.projectId, note.id);
  };

  const send = async () => {
    const addition = text.trim();
    if (!addition || busy) return;
    setSaving(true);

    const typed = note.source === "typed";
    const joined = (before: string | null) => [(before ?? "").trim(), addition].filter(Boolean).join("\n\n");

    const payload: Record<string, unknown> = {
      transcript: joined(note.transcript),
      status: "processing",
    };
    if (typed) payload.body = joined(note.body);

    const { error } = await supabase.from("notes").update(payload).eq("id", note.id);
    if (error) {
      setSaving(false);
      toast.error("Couldn't add that just now.");
      return;
    }

    setText("");
    setOpen(false);
    onDone();

    const { error: fnError } = await supabase.functions.invoke("process-note", {
      body: { noteId: note.id, regenerate: true },
    });
    setSaving(false);
    if (fnError) {
      if (isNeedsKeyError(fnError)) toast(NEEDS_KEY_MESSAGE);
      else toast("Kept your words, but the write-up didn't refresh.");
    }
    onDone();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-8 font-editorial italic text-[0.95rem] text-muted-foreground underline decoration-hairline underline-offset-4 hover:text-foreground transition-colors"
      >
        continue this note
      </button>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-end gap-2 rounded-[20px] border border-hairline bg-paper px-4 py-2.5">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
            if (e.key === "Escape" && !text.trim()) setOpen(false);
          }}
          rows={1}
          placeholder="Pick the thought back up…"
          aria-label="Continue this note"
          className="flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] leading-[1.6] outline-none placeholder:text-muted-foreground/60"
        />
        <button
          onClick={() => (text.trim() ? void send() : void speak())}
          disabled={busy && !text.trim()}
          aria-label={text.trim() ? "Add to this note" : "Speak more into this note"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : text.trim() ? (
            <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Mic className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
      <p className="mt-2 text-[0.78rem] text-muted-foreground/70">
        Speak or type — it joins this note, and the write-up is read over again.
      </p>
    </div>
  );
}
