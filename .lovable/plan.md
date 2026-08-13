# Swap the starter prompts for the mode menu

Replace the current prompts with the five use-case prompts. Only one file changes: `src/lib/prompts.ts` — the pills, routing, and capture-screen cue already read from it, so nothing else needs touching.

## New copy

Home and Notes (the global empty states) get all five, in this order:

- Capture an idea before I lose it
- Talk through a decision I'm stuck on
- Debrief what just happened
- Log last night's dream
- Say the thing I'm avoiding saying

Threads (loose notes) gets the two that fit "nothing has gathered yet":

- Talk through a decision I'm stuck on
- Say the thing I'm avoiding saying

Project stays project-specific, since a menu of general modes is the wrong ask inside an existing project — but reworded to match the new voice:

- Where did I leave this?
- What's not working yet?
- Debrief what just happened

## Notes

- Five pills wrap to two rows on a phone; the pill row already wraps, so no layout change.
- `PROMPT_SURFACES` toggles stay as they are, so any surface can still be switched off after testing.
