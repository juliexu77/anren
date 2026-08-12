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
  /** Inside a project view the label would just repeat the page title. */
  hideProject?: boolean;
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  const withinWeek = Date.now() - date.getTime() < 6 * 24 * 60 * 60 * 1000;
  if (withinWeek) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function NoteRow({ note, projects = [], onFile, onDelete, hideProject }: NoteRowProps) {
  const navigate = useNavigate();
  const time = new Date(note.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = dayLabel(note.recordedAt);
  const processing = note.status === "processing";
  const stillSaving = processing && note.source === "voice" && !note.audioPath;
  // A long recording is written up in pieces, so it takes a while longer.
  const long = (note.durationSeconds ?? 0) >= 600;
  const project = hideProject ? null : projects.find((p) => p.id === note.projectId) ?? null;

  return (
    <div className="group relative border-b border-hairline last:border-b-0">
      <Link to={`/note/${note.id}`} className="block py-5 pr-9">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[0.68rem] uppercase tracking-[0.15em]">
          {project && (
            <>
              <span className="text-primary/85">{project.name}</span>
              <span className="text-muted-foreground/45">·</span>
            </>
          )}
          <span className="text-muted-foreground/70">{day}</span>
          <span className="text-muted-foreground/45">·</span>
          <span className="text-muted-foreground/70 normal-case tracking-normal">{time}</span>
          {note.source === "typed" && (
            <PenLine className="h-3 w-3 text-muted-foreground/60" strokeWidth={1.5} aria-label="Typed note" />
          )}
          {note.durationSeconds ? (
            <>
              <span className="text-muted-foreground/45">·</span>
              <span className="tabular-nums normal-case tracking-normal text-muted-foreground/70">
                {formatDuration(note.durationSeconds)}
              </span>
            </>
          ) : null}
        </div>

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
          <p className="mt-1.5 text-[0.93rem] leading-[1.6] text-muted-foreground line-clamp-1">
            {note.synthesis}
          </p>
        )}
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
