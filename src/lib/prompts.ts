/**
 * Starter prompts for empty surfaces. One place to tune the copy — and one
 * switch per surface, so any of them can be turned off after testing without
 * touching the pages themselves.
 */

export type PromptSurface = "home" | "notes" | "project" | "threads";

/** Flip a surface to false and its prompts disappear. All false = feature off. */
export const PROMPT_SURFACES: Record<PromptSurface, boolean> = {
  home: true,
  notes: true,
  project: true,
  threads: true,
};

export const PROMPT_SETS: Record<PromptSurface, string[]> = {
  home: [
    "What's on my mind right now?",
    "What have I been avoiding today?",
    "An idea I don't want to lose",
    "What happened today that's worth remembering?",
  ],
  notes: [
    "What's on my mind right now?",
    "What have I been avoiding today?",
    "An idea I don't want to lose",
    "What happened today that's worth remembering?",
  ],
  project: [
    "Where did I leave this?",
    "What's not working yet?",
    "What am I actually trying to say here?",
  ],
  threads: ["Something that's been nagging at me", "A decision I'm putting off"],
};
