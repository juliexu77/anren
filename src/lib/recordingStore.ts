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

export async function appendSegment(sessionId: string, index: number, samples: Float32Array): Promise<void> {
  try {
    await tx(SEGMENTS, "readwrite", (s) =>
      s.put({ sessionId, index, samples: samples.buffer.slice(0) as ArrayBuffer }),
    );
  } catch {
    /* ignore — a dropped segment is better than a broken recording */
  }
}

export async function readSegments(sessionId: string): Promise<Float32Array[]> {
  try {
    const rows = await tx<{ sessionId: string; index: number; samples: ArrayBuffer }[]>(
      SEGMENTS,
      "readonly",
      (s) => s.getAll(),
    );
    return rows
      .filter((row) => row.sessionId === sessionId)
      .sort((a, b) => a.index - b.index)
      .map((row) => new Float32Array(row.samples));
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
