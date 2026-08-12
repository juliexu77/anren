import { useParams } from "react-router-dom";
import { NoteRow } from "@/components/NoteRow";
import { FolderReflection } from "@/components/FolderReflection";
import { useNotes } from "@/hooks/useNotes";
import { useProjects } from "@/hooks/useProjects";
import { FolderEmojiPicker } from "@/components/FolderEmojiPicker";
import { CaptureLine } from "@/components/CaptureLine";



const Index = () => {
  const { projectId } = useParams();
  const { notes, loading, updateNote, deleteNote } = useNotes(projectId ?? null);
  const { projects, setProjectEmoji } = useProjects();

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const heading = projectId ? project?.name ?? "Project" : "All notes";
  const autoFiled = projectId ? notes.filter((n) => n.autoFiledAt).length : 0;

  return (
    <div>
      <header className="mb-5">
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
        {projectId && autoFiled > 0 && (
          <p className="mt-1.5 text-[0.9rem] text-muted-foreground/70">
            {`anren added ${autoFiled} of these here`}
          </p>
        )}
        {projectId && notes.length >= 2 && (
          <FolderReflection projectId={projectId} notes={notes} />
        )}
      </header>

      <CaptureLine projectId={projectId ?? null} />

      {loading ? (
        <p className="text-[0.9rem] text-muted-foreground">Gathering your notes…</p>
      ) : !notes.length ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">
            {projectId ? "Nothing here yet." : "Nothing kept yet."}
          </p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
            {projectId
              ? "Talk here, or bring a note in from the feed — anren will read across them once a couple have gathered, and keep an eye out for new ones that belong."
              : "Start on Home — say what's on your mind, or type it. anren writes it up and everything gathers here."}
          </p>
        </div>



      ) : (
        <div>
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              projects={projects}
              onFile={(id, folder) => updateNote(id, { projectId: folder })}
              onDelete={deleteNote}
              hideProject={!!projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
