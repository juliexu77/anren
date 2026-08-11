/**
 * Durable buffer for a recording that is still happening.
 *
 * Everything about a live recording used to live in memory, so a screen lock,
 * a backgrounded tab, or a reload took the whole thought with it. This keeps
 * the samples on the device as they arrive, in IndexedDB (localStorage is far
 * too small for audio), so an interrupted recording can be picked back up.
 */

const DB_NAME = "anren-recordings";
const DB_VERSION = 1;
const SESSIONS = "sessions";
const SEGMENTS = "segments";

export interface RecordingSession {
  sessionId: string;
  noteId: string | null;
  projectId: string | null;
  userId: string;
  startedAt: number;
  sampleRate: number;
  elapsed: number;
  liveText: string;
  segmentCount: number;
  state: "recording" | "interrupted" | "finishing";
  uploaded: boolean;
  /** How many slices have already been pushed to storage during recording. */
  uploadedParts?: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS)) {
        db.createObjectStore(SESSIONS, { keyPath: "sessionId" });
      }
      if (!db.objectStoreNames.contains(SEGMENTS)) {
        db.createObjectStore(SEGMENTS, { keyPath: ["sessionId", "index"] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = run(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function saveSession(session: RecordingSession): Promise<void> {
  try {
    await tx(SESSIONS, "readwrite", (s) => s.put(session));
  } catch {
    /* recording continues in memory even if the device refuses to store */
  }
}

/**
 * Samples go to the device as 16-bit PCM rather than 32-bit floats — a quarter
 * of the space, so a long recording can't run the device out of room and start
 * silently dropping pieces of itself.
 */
export async function appendSegment(sessionId: string, index: number, samples: Float32Array): Promise<void> {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  try {
    await tx(SEGMENTS, "readwrite", (s) =>
      s.put({ sessionId, index, format: "i16", samples: pcm.buffer as ArrayBuffer }),
    );
  } catch (error) {
    // Losing a slice is how a long thought goes missing — say so out loud.
    console.error("Couldn't write a recording slice to this device:", (error as Error)?.message);
  }
}

export async function readSegments(sessionId: string): Promise<Float32Array[]> {
  try {
    const rows = await tx<{ sessionId: string; index: number; format?: string; samples: ArrayBuffer }[]>(
      SEGMENTS,
      "readonly",
      (s) => s.getAll(),
    );
    return rows
      .filter((row) => row.sessionId === sessionId)
      .sort((a, b) => a.index - b.index)
      .map((row) => {
        if (row.format !== "i16") return new Float32Array(row.samples);
        const pcm = new Int16Array(row.samples);
        const out = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
        return out;
      });
  } catch {
    return [];
  }
}


/** The one unfinished session, if there is one worth offering back. */
export async function findUnfinishedSession(userId: string): Promise<RecordingSession | null> {
  try {
    const rows = await tx<RecordingSession[]>(SESSIONS, "readonly", (s) => s.getAll());
    const mine = rows
      .filter((row) => row.userId === userId)
      .sort((a, b) => b.startedAt - a.startedAt);
    return mine[0] ?? null;
  } catch {
    return null;
  }
}

export async function clearSession(sessionId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction([SESSIONS, SEGMENTS], "readwrite");
      transaction.objectStore(SESSIONS).delete(sessionId);
      const cursorRequest = transaction.objectStore(SEGMENTS).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        if ((cursor.value as { sessionId: string }).sessionId === sessionId) cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    /* nothing to clear */
  }
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Anything older than a week is no longer something anyone wants back. */
export async function pruneStaleSessions(): Promise<void> {
  try {
    const rows = await tx<RecordingSession[]>(SESSIONS, "readonly", (s) => s.getAll());
    const cutoff = Date.now() - WEEK;
    await Promise.all(
      rows.filter((row) => row.startedAt < cutoff).map((row) => clearSession(row.sessionId)),
    );
  } catch {
    /* ignore */
  }
}
