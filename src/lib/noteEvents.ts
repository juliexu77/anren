/**
 * A tiny shared nerve for the archive: every list of notes on screen — the feed
 * and the rail — hears about a delete or an undo at the same moment, so nothing
 * you just removed lingers in a corner of the app.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Notes hidden locally while their undo window is still open. */
export const hiddenNoteIds = new Set<string>();

export function onNotesChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notesChanged() {
  listeners.forEach((listener) => listener());
}

export function hideNote(id: string) {
  hiddenNoteIds.add(id);
  notesChanged();
}

export function unhideNote(id: string) {
  hiddenNoteIds.delete(id);
  notesChanged();
}
