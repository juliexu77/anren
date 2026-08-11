import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Search, Sparkles, LayoutList, Plus, Settings, Check, MoreHorizontal } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useNotes } from "@/hooks/useNotes";
import { FolderEmojiPicker } from "@/components/FolderEmojiPicker";

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
  const { notes } = useNotes();
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

  const submit = async () => {
    const created = await createProject(name);
    setName("");
    setAdding(false);
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
    if (location.pathname === `/folder/${id}`) navigate("/");
  };

  return (
    <div className="flex flex-col h-full pt-6 pb-6 px-4">
      <Link
        to="/"
        onClick={onNavigate}
        className="hidden md:block px-3 font-editorial text-[1.35rem] tracking-[0.01em] mb-7 lowercase"
      >
        anren
      </Link>

      <nav className="flex flex-col gap-0.5 md:mt-0 mt-10">
        <NavLink to="/" end className={navItemClass} onClick={onNavigate}>
          <LayoutList className="w-[17px] h-[17px]" strokeWidth={1.5} />
          Notes
        </NavLink>
        <NavLink to="/search" className={navItemClass} onClick={onNavigate}>
          <Search className="w-[17px] h-[17px]" strokeWidth={1.5} />
          Search
        </NavLink>
        <NavLink to="/on-my-mind" className={navItemClass} onClick={onNavigate}>
          <Sparkles className="w-[17px] h-[17px]" strokeWidth={1.5} />
          On my mind
        </NavLink>
      </nav>

      <div className="mt-8 flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">Folders</span>
          <button
            onClick={() => setAdding(true)}
            aria-label="New folder"
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
                  aria-label="Save folder name"
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
                    <DropdownMenuItem onClick={() => removeFolder(p.id)}>Delete folder</DropdownMenuItem>
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
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setName("");
                  }
                }}
                onBlur={() => (name.trim() ? submit() : setAdding(false))}
                placeholder="Folder name"
                className="flex-1 bg-transparent text-[0.9rem] outline-none placeholder:text-muted-foreground/50"
              />
              <button onClick={submit} aria-label="Save folder" className="text-muted-foreground">
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {!projects.length && !adding && (
            <p className="px-3 text-[0.8rem] leading-relaxed text-muted-foreground/70">
              Folders keep related notes together.
            </p>
          )}
        </div>

        {notes.length > 0 && (
          <div className="mt-8">
            <span className="block px-3 mb-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Recent
            </span>
            <div className="flex flex-col gap-0.5">
              {notes.slice(0, 10).map((n) => (
                <NavLink
                  key={n.id}
                  to={`/note/${n.id}`}
                  onClick={onNavigate}
                  className={cn(
                    navItemClass({ isActive: location.pathname === `/note/${n.id}` }),
                    "block truncate text-[0.85rem]",
                  )}
                >
                  <span className="truncate">
                    {n.title ?? (n.status === "processing" ? "Writing this up…" : "Untitled note")}
                  </span>
                </NavLink>
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
