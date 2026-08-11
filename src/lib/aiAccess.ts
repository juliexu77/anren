/**
 * Anren's own Claude key covers a generous first stretch of write-ups, after
 * which the backend answers 402 and the person connects their own key. Nothing
 * about that budget is ever shown in the interface — only this final moment.
 */
export function isNeedsKeyError(error: unknown): boolean {
  const context = (error as { context?: { status?: number } } | null)?.context;
  return context?.status === 402;
}

export const NEEDS_KEY_MESSAGE = "Write-ups run on Claude — connect your own key in Settings to keep going.";
