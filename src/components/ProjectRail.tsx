import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, Home, LayoutList, Plus, Settings, Check, MoreHorizontal } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useNotes } from "@/hooks/useNotes";
import { FolderEmojiPicker } from "@/components/FolderEmojiPicker";
import { NoteRailItem } from "@/components/NoteRailItem";
import { ProjectSuggestion } from "@/components/ProjectSuggestion";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.9rem] transition-colors",
    isActive ? "bg-paper-sunk text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-paper-sunk/60",
  );

export function ProjectRail({ onNavigate }: { onNavigate?: () => void }) {
  const { projects, createProject, renameProject, deleteProject, setProjectEmoji } = useProjects();
  const { notes, updateNote, deleteNote } = useNotes();
  const [adding, setAdding] = useState(false);

  const [name, setName] = useState("");
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!justCreatedId) return;
    const timer = window.setTimeout(() => setJustCreatedId(null), 1400);
    return () => window.clearTimeout(timer);
  }, [justCreatedId]);

  const pendingName = useRef("");
  const submitting = useRef(false);

  const startAdding = () => {
    pendingName.current = "";
    submitting.current = false;
    setAdding(true);
  };

  const cancelAdding = () => {
    pendingName.current = "";
    submitting.current = true;
    setAdding(false);
    setName("");
  };

  const submit = async () => {
    // Enter (or the check) closes the row, which fires a trailing blur — without
    // this guard the same folder gets created twice.
    if (submitting.current) return;
    const value = pendingName.current.trim();
    if (!value) {
      cancelAdding();
      return;
    }
    submitting.current = true;
    pendingName.current = "";
    setName("");
    setAdding(false);
    const created = await createProject(value);
    if (created) {
      setJustCreatedId(created.id);
      navigate(`/folder/${created.id}`);
      onNavigate?.();
    }
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) renameProject(id, renameValue);
    setRenamingId(null);
    setRenameValue("");
  };

  const removeFolder = (id: string) => {
    deleteProject(id);
    if (location.pathname === `/folder/${id}`) navigate("/notes");
  };

  return (
    <div className="flex flex-col h-full pt-6 pb-6 px-4">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center px-3 mb-7 font-editorial text-[1.35rem] tracking-[0.01em] lowercase"
      >
        anren
      </Link>

      <NavLink
        to="/capture"
        onClick={onNavigate}
        aria-label="New thought"
        className="mb-5 flex items-center justify-center gap-2 rounded-[12px] bg-plum px-4 py-2.5 text-[0.92rem] text-plum-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="w-[16px] h-[16px]" strokeWidth={1.75} />
        New thought
      </NavLink>

      <nav className="flex flex-col gap-1.5">
        <NavLink to="/" end className={navItemClass} onClick={onNavigate} aria-label="Home">
          <Home className="w-[17px] h-[17px]" strokeWidth={1.5} />
          Home
        </NavLink>
        <NavLink to="/notes" className={navItemClass} onClick={onNavigate} aria-label="Notes">
          <LayoutList className="w-[17px] h-[17px]" strokeWidth={1.5} />
          Notes
        </NavLink>
        <NavLink to="/ask" className={navItemClass} onClick={onNavigate} aria-label="Ask">
          <Sparkles className="w-[17px] h-[17px]" strokeWidth={1.5} />
          Ask
        </NavLink>
      </nav>


      <div className="mt-8 flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">Projects</span>
          <button
            onClick={startAdding}
            aria-label="New project"
            className="text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <Plus className="w-[15px] h-[15px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {projects.map((p) =>
            renamingId === p.id ? (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(p.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => commitRename(p.id)}
                  className="flex-1 bg-transparent text-[0.9rem] outline-none"
                />
                <button
                  onClick={() => commitRename(p.id)}
                  aria-label="Save project name"
                  className="text-muted-foreground"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div key={p.id} className="group relative">
                <NavLink
                  to={`/folder/${p.id}`}
                  onClick={onNavigate}
                  className={cn(
                    navItemClass({ isActive: location.pathname === `/folder/${p.id}` }),
                    "truncate pr-8",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex shrink-0",
                      p.id === justCreatedId && "motion-safe:animate-stipple-in [animation-delay:180ms]",
                    )}
                  >
                    <FolderEmojiPicker
                      name={p.name}
                      emoji={p.emoji}
                      onSelect={(emoji) => setProjectEmoji(p.id, emoji)}
                    />
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      p.id === justCreatedId && "motion-safe:animate-stipple-in",
                    )}
                  >
                    {p.name}
                  </span>
                </NavLink>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Options for ${p.name}`}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground hover:bg-paper-sunk focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
                  >
                    <MoreHorizontal className="w-[15px] h-[15px]" strokeWidth={1.5} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameValue(p.name);
                        setRenamingId(p.id);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => removeFolder(p.id)}>Delete project</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          )}

          {adding && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  pendingName.current = e.target.value;
                  setName(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") cancelAdding();
                }}
                onBlur={() => submit()}
                placeholder="Name this project"
                className="flex-1 bg-transparent text-[0.9rem] outline-none placeholder:text-muted-foreground/50"
              />
              <button onClick={submit} aria-label="Save project" className="text-muted-foreground">
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {!projects.length && !adding && (
            <p className="px-3 text-[0.8rem] leading-relaxed text-muted-foreground/70">
              A project is a thread you keep coming back to. anren will notice them as you talk.
            </p>
          )}
        </div>

        <div className="mt-3">
          <ProjectSuggestion enabled={notes.length >= 5} variant="rail" />
        </div>

        {notes.length > 0 && (
          <div className="mt-8">
            <span className="block px-3 mb-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Recent
            </span>
            <div className="flex flex-col gap-0.5">
              {notes.slice(0, 10).map((n) => (
                <NoteRailItem
                  key={n.id}
                  note={n}
                  projects={projects}
                  onNavigate={onNavigate}
                  className={navItemClass({ isActive: false })}
                  onRename={(title) => updateNote(n.id, { title })}
                  onMove={(projectId) => updateNote(n.id, { projectId })}
                  onDelete={() => {
                    deleteNote(n.id);
                    if (location.pathname === `/note/${n.id}`) navigate("/notes");
                  }}
                />
              ))}
            </div>
          </div>
        )}

      </div>


      <NavLink to="/settings" className={navItemClass} onClick={onNavigate}>
        <Settings className="w-[17px] h-[17px]" strokeWidth={1.5} />
        Settings
      </NavLink>
    </div>
  );
}
