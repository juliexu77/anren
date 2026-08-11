import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { Note } from "@/types/note";
import { formatDuration } from "@/lib/wav";

export function NoteRow({ note }: { note: Note }) {
  const time = new Date(note.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const processing = note.status === "processing";

  return (
    <Link
      to={`/note/${note.id}`}
      className="group block py-5 border-b border-hairline last:border-b-0"
    >
      <div className="flex items-baseline gap-3">
        <h3 className="note-title flex-1 min-w-0">
          {note.title ?? (processing ? "Writing this up…" : "Untitled note")}
        </h3>
        {processing && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-muted-foreground/70" />}
      </div>

      {note.synthesis && (
        <p className="mt-2 text-[0.93rem] leading-[1.65] text-muted-foreground line-clamp-2">
          {note.synthesis}
        </p>
      )}

      <div className="mt-2.5 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">
        <span>{time}</span>
        {note.durationSeconds ? (
          <>
            <span>·</span>
            <span className="tabular-nums normal-case tracking-normal">
              {formatDuration(note.durationSeconds)}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
