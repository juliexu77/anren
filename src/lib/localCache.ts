/**
 * Clears what Anren keeps on this device: the session flags that stop a
 * look-back from being asked for twice, and any recording slices left behind
 * by a session that never finished.
 */
import { clearSession } from "@/lib/recordingStore";

function clearSessionFlags(): number {
  let cleared = 0;
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("anren:"));
    for (const key of keys) {
      sessionStorage.removeItem(key);
      cleared += 1;
    }
  } catch {
    /* private mode */
  }
  return cleared;
}

async function clearRecordingBuffers(): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    try {
      const request = indexedDB.open("anren-recordings");
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("sessions")) {
          db.close();
          resolve(0);
          return;
        }
        const all = db.transaction("sessions", "readonly").objectStore("sessions").getAll();
        all.onsuccess = async () => {
          const rows = (all.result ?? []) as { sessionId: string }[];
          db.close();
          for (const row of rows) {
            await clearSession(row.sessionId);
            count += 1;
          }
          resolve(count);
        };
        all.onerror = () => {
          db.close();
          resolve(0);
        };
      };
      request.onerror = () => resolve(0);
    } catch {
      resolve(count);
    }
  });
}

export async function clearLocalCache(): Promise<{ flags: number; recordings: number }> {
  const flags = clearSessionFlags();
  const recordings = await clearRecordingBuffers();
  return { flags, recordings };
}
