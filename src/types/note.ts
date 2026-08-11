export type NoteStatus = "processing" | "ready" | "failed" | "needs_key";
export type NoteSource = "voice" | "typed";

export interface Note {
  id: string;
  projectId: string | null;
  title: string | null;
  synthesis: string | null;
  transcript: string | null;
  body: string | null;
  source: NoteSource;
  audioPath: string | null;
  durationSeconds: number | null;
  recordedAt: string;
  status: NoteStatus;
  errorMessage: string | null;
}

export interface Project {
  id: string;
  name: string;
  position: number;
  emoji: string | null;
  noteCount?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapNote(row: any): Note {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    title: row.title ?? null,
    synthesis: row.synthesis ?? null,
    transcript: row.transcript ?? null,
    body: row.body ?? null,
    source: (row.source as NoteSource) ?? "voice",
    audioPath: row.audio_path ?? null,
    durationSeconds: row.duration_seconds ?? null,
    recordedAt: row.recorded_at,
    status: (row.status as NoteStatus) ?? "processing",
    errorMessage: row.error_message ?? null,
  };
}
