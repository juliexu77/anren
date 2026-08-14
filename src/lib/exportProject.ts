import type { Note, Project } from "@/types/note";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

/**
 * Everything you've said inside a project, in the order you said it — plain
 * enough to hand straight to Claude or ChatGPT and pick up where you left off.
 */
export function projectMarkdown(project: Project, notes: Note[]) {
  const ordered = [...notes].sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
  const lines: string[] = [`# ${project.name}`, ""];
  lines.push(`${ordered.length} note${ordered.length === 1 ? "" : "s"}, kept in anren.`, "");

  for (const note of ordered) {
    lines.push(`## ${note.title ?? "Untitled note"}`, "", `*${fmt(note.recordedAt)}*`, "");
    if (note.synthesis) {
      lines.push("### Summary", "", note.synthesis.trim(), "");
    }
    const words = note.body ?? note.transcript;
    if (words) {
      lines.push("### In my words", "", words.trim(), "");
    }
    lines.push("---", "");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Downloads the project as a single markdown file. */
export function downloadProjectMarkdown(project: Project, notes: Note[]) {
  const blob = new Blob([projectMarkdown(project, notes)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(project.name)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
