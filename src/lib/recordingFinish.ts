import { supabase } from "@/integrations/supabase/client";
import { encodeWav } from "@/lib/wav";
import type { RecordingSession } from "@/lib/recordingStore";

/** Where the in-flight pieces of a recording live while it's still happening. */
export function partsPrefix(userId: string, noteId: string): string {
  return `${userId}/${noteId}/`;
}

function partPath(userId: string, noteId: string, index: number): string {
  return `${partsPrefix(userId, noteId)}part${String(index).padStart(4, "0")}.wav`;
}

/** Did the file actually land, whatever the upload call claimed? */
async function objectExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data } = await supabase.storage.from("voice-notes").list(folder, { search: name, limit: 1 });
  return (data ?? []).some((f) => f.name === name);
}

async function upload(path: string, blob: Blob, attempts = 4): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { error } = await supabase.storage
      .from("voice-notes")
      .upload(path, blob, { contentType: "audio/wav", upsert: true });
    if (!error) return true;
    // A long upload can finish server-side while the response is lost — never
    // call a recording gone without looking for it first.
    if (await objectExists(path)) return true;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return objectExists(path);
}

/**
 * Push one slice of audio up while the person is still talking, so a browser
 * that dies at the moment of stopping still has the whole thought on the server.
 */
export async function uploadPart(
  userId: string,
  noteId: string,
  index: number,
  segments: Float32Array[],
  sampleRate: number,
): Promise<boolean> {
  const blob = encodeWav(segments, sampleRate);
  if (!blob.size) return false;
  return upload(partPath(userId, noteId, index), blob, 2);
}

/** Upload the audio recorded so far as one file. Safe to call repeatedly. */
export async function uploadAudio(
  userId: string,
  noteId: string,
  segments: Float32Array[],
  sampleRate: number,
): Promise<string | null> {
  const blob = encodeWav(segments, sampleRate);
  if (blob.size < 4096) return null;
  const path = `${userId}/${noteId}.wav`;
  return (await upload(path, blob)) ? path : null;
}


/** Make sure a note row exists for this session, creating one if needed. */
export async function ensureNote(session: RecordingSession): Promise<string | null> {
  if (session.noteId) return session.noteId;
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: session.userId,
      project_id: session.projectId,
      continues_note_id: session.continuesNoteId ?? null,
      duration_seconds: session.elapsed,
      recorded_at: new Date(session.startedAt).toISOString(),
      status: "processing",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Couldn't create the note row:", error?.message);
    return null;
  }
  return data.id as string;
}

/** Hand a note with audio attached to the write-up. */
export function requestWriteUp(noteId: string): void {
  void supabase.functions.invoke("process-note", { body: { noteId } }).then(({ error }) => {
    if (error) console.error("process-note failed:", error.message);
  });
}

/**
 * Turn a stored session into a finished note: get the audio onto the server,
 * then hand it to the write-up. Used both when someone taps stop and when a
 * recording is recovered after an interruption.
 *
 * The single-file upload is preferred (it plays back directly), but if it
 * can't complete we fall back to the parts already uploaded during recording,
 * which the write-up stitches back together server-side.
 */
export async function finishSession(
  session: RecordingSession,
  segments: Float32Array[],
): Promise<{ noteId: string | null; saved: boolean }> {
  const noteId = await ensureNote(session);
  if (!noteId) return { noteId: null, saved: false };

  let path = await uploadAudio(session.userId, noteId, segments, session.sampleRate);

  if (!path) {
    // Whole-file upload didn't make it — the slices pushed up during the
    // recording do, so hand the write-up the folder instead.
    const prefix = partsPrefix(session.userId, noteId);
    const { data: parts } = await supabase.storage
      .from("voice-notes")
      .list(prefix.replace(/\/$/, ""), { limit: 1 });
    if ((parts ?? []).length) path = prefix;
  }

  if (!path) {
    // Nothing is lost: the audio is still on this device and the next launch
    // offers it back, so this stays in progress rather than failing outright.
    await supabase
      .from("notes")
      .update({ duration_seconds: session.elapsed })
      .eq("id", noteId);
    return { noteId, saved: false };
  }


  await supabase
    .from("notes")
    .update({ audio_path: path, duration_seconds: session.elapsed, status: "processing" })
    .eq("id", noteId);

  requestWriteUp(noteId);

  return { noteId, saved: true };
}
