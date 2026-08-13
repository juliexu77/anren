# Making anren feel like it's paying attention

Five moves, in priority order. Each one uses the same nouns — your projects and the loose clusters anren has noticed — so capture, Threads, a note, and Reflect stop feeling like four features.

## 1. The noticing beat after capture

Today: keep a note, land back home, a spinner says "anren is writing it up…", then bullets appear. The filing decision already happens (`associate-note` runs after `process-note`) but is completely invisible.

Change it into a short, honest beat on the capture screen before you land:

```text
   anren is writing it up…
   → titling it…
   → reading it against what you keep…
   → This sits with Writing concepts.        [ 1s hold ]
```

- The steps are driven by the real pipeline, not a fake timer: transcript saved → write-up returned → filing verdict returned. Labels only advance when the underlying step actually completes.
- The last line is the payoff and only appears when there is something true to say: the project it was filed into, or the loose cluster it joins ("This rhymes with three other notes about leaving tech"). If neither, it says nothing and lands quietly — no invented magic.
- To do the second case, the filing step also looks at active loose clusters, not just projects, and returns whichever it found.
- Filing is never silent-and-final: the landing note shows "filed into Writing concepts · not that?" for one visit, so a wrong guess costs one tap.

## 2. Threads shows what changed

- A quiet accent dot and a "2 new" mark on any project or cluster that grew since your last visit. The existing per-project "last looked" bookkeeping stays, but the mark is only cleared when you actually open that project — right now it's wiped the moment the page loads, so nothing ever reads as new.
- Section ordering favours movement: whatever changed sits above whatever is stable.
- "Gather into a project" gets a follow-through: the cluster's note rows visibly draw together and the heading becomes the project name, then the card settles into its projects-section form. About 600ms, motion-safe, no confetti.

## 3. Clusters can join an existing project

Each loose cluster offers two doors instead of one:

```text
Leaving tech · 3 notes
These have been accumulating
Add to Writing concepts →      Start a project →
```

The suggested existing project comes from the same matching logic capture uses, run over the cluster as a whole; when nothing matches confidently only "Start a project" shows.

## 4. A note always knows where it sits

Move membership from the bottom of the note (and out of the overflow menu) up under the title as two small chips: the project it's in, and any cluster it's part of. The cluster chip opens Reflect scoped to that cluster (see below), not the generic Threads list. A note with no project shows a quiet "not in a project" chip that opens the picker.

## 5. Reflect becomes the reading of Threads

- Opens with what moved, by name: "Writing concepts pulled ahead this week; Parenting thoughts is still loose notes." The weekly read is regenerated with the projects and clusters supplied to it, and is told to name them.
- Tension is its own callout, not buried in prose: where two threads pull against each other, stated in one or two lines and set apart in the accent tone.
- A per-thread lens replaces one global ask box: arriving from a cluster or project scopes the questions and the answers to it ("What am I actually stuck on with leaving tech?"). The global ask stays available underneath.
- "Look again" stops being the main affordance. Instead: "Updated after your note this morning." Regenerating is still possible, quietly.

## Order of work

1. Noticing beat + gentle undo (capture, filing verdict returns clusters too)
2. New-since marks on Threads + gather transition
3. Add-to-existing-project on clusters
4. Note-detail chips
5. Reflect rewrite: named openers, tension callout, scoped lens, live timestamp

## Technical notes

- Capture: `VoiceCapture` / `WriteCapture` await a staged pipeline instead of firing `process-note` and navigating. `useTextCapture` already returns a `filedInto` promise — generalise it into a small state machine both screens share, and extend `associate-note` to return `{ projectId, projectName, threadId, threadName }` and to consider active `threads` rows when no project matches.
- Threads: fix `useProjectOverview` so the "last looked" stamp is written on project open rather than on list render; extend the loose-cluster path with a suggested existing project (reuse `associate-note`'s prompt shape against a cluster's notes). `useThreads.promote` already accepts an existing project id — wire it to the new button.
- Reflect: `weekly-digest` takes projects + active clusters as context and returns `{ narrative, movement[], tension, themes[] }`; `weekly_digests` gets the extra fields in its JSON columns (no new tables). Thread-scoped asking reuses `ask-notes` with a note-id filter.
- Motion is CSS-only and respects `prefers-reduced-motion`. No new colours or type; existing tokens only.
