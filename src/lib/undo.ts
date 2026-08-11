import { toast } from "sonner";

interface UndoableOptions {
  message: string;
  /** Runs when the person taps Undo. */
  onUndo: () => void | Promise<void>;
  /** Runs once the window closes and the delete becomes permanent. */
  onFinalize: () => void | Promise<void>;
  duration?: number;
}

/**
 * Deletes quietly and offers a short window to change your mind.
 * The caller has already hidden the thing; this decides whether it comes back.
 */
export function undoableDelete({ message, onUndo, onFinalize, duration = 6000 }: UndoableOptions) {
  let undone = false;

  const timer = window.setTimeout(() => {
    if (!undone) void onFinalize();
  }, duration);

  toast(message, {
    duration,
    action: {
      label: "Undo",
      onClick: () => {
        undone = true;
        window.clearTimeout(timer);
        void onUndo();
      },
    },
  });
}
