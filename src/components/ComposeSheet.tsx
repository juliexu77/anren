import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

interface ComposeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
}

export function ComposeSheet({ open, onOpenChange, projectId = null }: ComposeSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setBody("");
    setTitle("");
    setWhen(toLocalInput(new Date()));
  };

  const save = async () => {
    if (!user || !body.trim() || saving) return;
    setSaving(true);

    const recordedAt = new Date(when);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        project_id: projectId,
        source: "typed",
        body: body.trim(),
        transcript: body.trim(),
        title: title.trim() || null,
        recorded_at: Number.isNaN(recordedAt.getTime()) ? new Date().toISOString() : recordedAt.toISOString(),
        status: "processing",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      toast.error("Couldn't keep that note.");
      return;
    }

    supabase.functions.invoke("process-note", { body: { noteId: data.id } }).then(({ error: fnError }) => {
      if (fnError) console.error("process-note failed:", fnError.message);
    });

    reset();
    onOpenChange(false);
    navigate(`/note/${data.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[560px] rounded-[22px] border-hairline bg-paper">
        <DialogHeader>
          <DialogTitle className="font-editorial text-[1.35rem] tracking-[-0.01em] text-left">
            Write it down
          </DialogTitle>
        </DialogHeader>

        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste or type what you were thinking…"
          rows={9}
          className="w-full resize-none rounded-[16px] border border-hairline bg-paper-sunk/40 px-4 py-3.5 text-[0.95rem] leading-[1.7] outline-none focus:border-primary/40 placeholder:text-muted-foreground/60"
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="block mb-1.5 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Title — optional
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Anren will write one if you don't"
              className="w-full rounded-full border border-hairline bg-paper px-4 py-2.5 text-[0.92rem] outline-none focus:border-primary/40 placeholder:text-muted-foreground/60"
            />
          </label>
          <label className="sm:w-[215px]">
            <span className="block mb-1.5 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              When
            </span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-full border border-hairline bg-paper px-4 py-2.5 text-[0.92rem] outline-none focus:border-primary/40"
            />
          </label>
        </div>

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            className="px-4 py-2 rounded-full text-[0.88rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!body.trim() || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-[0.88rem] disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Keep it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
