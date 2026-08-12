import { Link, useNavigate } from "react-router-dom";
import { Loader2, MoreHorizontal, PenLine } from "lucide-react";
import type { Note, Project } from "@/types/note";
import { formatDuration } from "@/lib/wav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteRowProps {
  note: Note;
  projects?: Project[];
  onFile?: (noteId: string, projectId: string | null) => void;
  onDelete?: (noteId: string) => void;
}

export function NoteRow({ note, projects = [], onFile, onDelete }: NoteRowProps) {
  const navigate = useNavigate();
  const time = new Date(note.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const processing = note.status === "processing";
  const stillSaving = processing && note.source === "voice" && !note.audioPath;
  // A long recording is written up in pieces, so it takes a while longer.
  const long = (note.durationSeconds ?? 0) >= 600;

  return (
    <div className="group relative border-b border-hairline last:border-b-0">
      <Link to={`/note/${note.id}`} className="block py-5 pr-9">
        <div className="flex items-baseline gap-3">
          <h3 className="note-title flex-1 min-w-0">
            {note.title ??
              (stillSaving
                ? "Still saving…"
                : processing
                  ? long
                    ? "Writing this up — this one's long"
                    : "Writing this up…"
                  : "Untitled note")}
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
          {note.source === "typed" && (
            <PenLine className="w-3 h-3" strokeWidth={1.5} aria-label="Typed note" />
          )}
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

      {(onDelete || onFile) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Note options"
            className="absolute right-0 top-4 p-1.5 rounded-full text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground hover:bg-paper-sunk focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/note/${note.id}`)}>Open</DropdownMenuItem>
            {onFile && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Add to project…</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {projects.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => onFile(note.id, p.id)}>
                      {p.emoji ? `${p.emoji}  ` : ""}
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                  {note.projectId && (
                    <DropdownMenuItem onClick={() => onFile(note.id, null)}>
                      Remove from project
                    </DropdownMenuItem>
                  )}
                  {!projects.length && <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(note.id)}>Delete</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
