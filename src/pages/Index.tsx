import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { NoteRow } from "@/components/NoteRow";
import { useNotes } from "@/hooks/useNotes";
import { useProjects } from "@/hooks/useProjects";
import { FolderEmojiPicker } from "@/components/FolderEmojiPicker";
import type { Note } from "@/types/note";

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function groupByDay(notes: Note[]) {
  const groups: { label: string; notes: Note[] }[] = [];
  for (const note of notes) {
    const label = dayLabel(note.recordedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.notes.push(note);
    else groups.push({ label, notes: [note] });
  }
  return groups;
}

const Index = () => {
  const { projectId } = useParams();
  const { notes, loading } = useNotes(projectId ?? null);
  const { projects, setProjectEmoji } = useProjects();

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const heading = projectId ? project?.name ?? "Folder" : "Notes";
  const groups = useMemo(() => groupByDay(notes), [notes]);

  return (
    <div>
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          {project && (
            <FolderEmojiPicker
              name={project.name}
              emoji={project.emoji}
              size="lg"
              onSelect={(emoji) => setProjectEmoji(project.id, emoji)}
            />
          )}
          <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">{heading}</h1>
        </div>
        <p className="mt-1.5 text-[0.9rem] text-muted-foreground">
          {notes.length ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : "Nothing here yet"}
        </p>
      </header>


      {loading ? (
        <p className="text-[0.9rem] text-muted-foreground">Gathering your notes…</p>
      ) : !notes.length ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">Start by saying something out loud.</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
            Tap the microphone below and ramble. Anren will title it, sum it up, and keep it here for you.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                {group.label}
              </h2>
              <div>
                {group.notes.map((note) => (
                  <NoteRow key={note.id} note={note} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
