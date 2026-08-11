import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useLongPress } from "@/hooks/useLongPress";
import { cn } from "@/lib/utils";
import type { Note, Project } from "@/types/note";


interface Props {
  note: Note;
  projects: Project[];
  className: string;
  onNavigate?: () => void;
  onRename: (title: string) => void;
  onMove: (projectId: string | null) => void;
  onDelete: () => void;
}

export function NoteRailItem({
  note,
  projects,
  className,
  onNavigate,
  onRename,
  onMove,
  onDelete,
}: Props) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const { handlers } = useLongPress(() => setOpen(true));

  const label = note.title ?? (note.status === "processing" ? "Writing this up…" : "Untitled note");

  const commit = () => {
    if (draft.trim() && draft.trim() !== label) onRename(draft.trim());
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setRenaming(false);
          }}
          onBlur={commit}
          className="flex-1 bg-transparent text-[0.85rem] outline-none"
        />
        <button onClick={commit} aria-label="Save note title" className="text-muted-foreground">
          <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <NavLink
        to={`/note/${note.id}`}
        onClick={(e) => {
          handlers.onClick(e);
          if (!e.defaultPrevented) onNavigate?.();
        }}
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
        onTouchCancel={handlers.onTouchCancel}
        onContextMenu={handlers.onContextMenu}
        className={cn(
          className,
          "block truncate text-[0.85rem] select-none",
          location.pathname === `/note/${note.id}` && "bg-paper-sunk text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
      </NavLink>

      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem
          onClick={() => {
            setDraft(note.title ?? "");
            setRenaming(true);
          }}
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => onMove(p.id)}>
                {p.name}
              </DropdownMenuItem>
            ))}
            {note.projectId && (
              <DropdownMenuItem onClick={() => onMove(null)}>Remove from folder</DropdownMenuItem>
            )}
            {!projects.length && <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete}>Delete note</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
