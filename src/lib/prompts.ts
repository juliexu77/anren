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

const MODE_MENU = [
  "Capture an idea before I lose it",
  "Talk through a decision I'm stuck on",
  "Debrief what just happened",
  "Log last night's dream",
  "Say the thing I'm avoiding saying",
];

export const PROMPT_SETS: Record<PromptSurface, string[]> = {
  home: MODE_MENU,
  notes: MODE_MENU,
  project: [
    "Where did I leave this?",
    "What's not working yet?",
    "Debrief what just happened",
  ],
  threads: [
    "Talk through a decision I'm stuck on",
    "Say the thing I'm avoiding saying",
  ],
};
