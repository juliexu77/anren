import { supabase } from "@/integrations/supabase/client";
import { encodeWav } from "@/lib/wav";
import type { RecordingSession } from "@/lib/recordingStore";

/** Upload the audio recorded so far for a note. Safe to call repeatedly. */
export async function uploadAudio(
  userId: string,
  noteId: string,
  segments: Float32Array[],
  sampleRate: number,
): Promise<string | null> {
  const blob = encodeWav(segments, sampleRate);
  if (blob.size < 4096) return null;
  const path = `${userId}/${noteId}.wav`;
  const { error } = await supabase.storage
    .from("voice-notes")
    .upload(path, blob, { contentType: "audio/wav", upsert: true });
  return error ? null : path;
}

/** Make sure a note row exists for this session, creating one if needed. */
export async function ensureNote(session: RecordingSession): Promise<string | null> {
  if (session.noteId) return session.noteId;
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: session.userId,
      project_id: session.projectId,
      duration_seconds: session.elapsed,
      recorded_at: new Date(session.startedAt).toISOString(),
      status: "processing",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/**
 * Turn a stored session into a finished note: upload the audio, then hand it
 * to the write-up. Used both when someone taps stop and when a recording is
 * recovered after an interruption.
 */
export async function finishSession(
  session: RecordingSession,
  segments: Float32Array[],
): Promise<string | null> {
  const noteId = await ensureNote(session);
  if (!noteId) return null;

  const path = await uploadAudio(session.userId, noteId, segments, session.sampleRate);

  if (!path) {
    await supabase
      .from("notes")
      .update({ status: "failed", error_message: "Anren couldn't keep the audio for this one." })
      .eq("id", noteId);
    return noteId;
  }

  await supabase
    .from("notes")
    .update({ audio_path: path, duration_seconds: session.elapsed, status: "processing" })
    .eq("id", noteId);

  supabase.functions.invoke("process-note", { body: { noteId } }).then(({ error }) => {
    if (error) console.error("process-note failed:", error.message);
  });

  return noteId;
}
