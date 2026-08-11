# Folder emoji + sparkle-into-place

Folders get a small emoji chosen automatically from the name, editable any time, and new folders arrive in the sidebar with a quiet sparkle.

## What you'll see

**Creating a folder.** You type a name and hit enter. The folder appears immediately with a soft placeholder mark, and a moment later the emoji settles in — "Coworking space" gets a key or a doorway, "Mom" gets something warm, "Book ideas" gets a book. No dialog, no picking.

**The sparkle.** When a folder lands in the sidebar it fades and lifts in over about half a second, and two or three tiny points of light drift out from behind the emoji and dissolve. Clay-rose, hairline-thin, gone in under a second. It only plays for a folder that was just created — never on page load or navigation, so the sidebar stays still when you're just moving around.

**Changing the emoji.** Click the emoji next to any folder in the sidebar and a small panel opens: a row of alternate suggestions for that name, a short list of common marks, and a field where you can type or paste any emoji you like. Pick one and it saves instantly. Same panel is reachable from the folder's own page header, next to the title.

**If the suggestion fails.** The folder keeps a neutral mark and nothing blocks. You can set it by hand.

## Voice and restraint

The animation reads as settling, not celebrating — no confetti, no bounce, no sound. If your system is set to reduce motion, the folder simply fades in and the sparkles don't play.

## Technical notes

**Database**
- Migration adding `emoji text` to `public.projects` (nullable, no default). Existing folders stay null and render the neutral mark until edited or backfilled on next open.

**Emoji suggestion**
- New edge function `suggest-folder-emoji`: takes a folder name, returns `{ emoji, alternates: string[] }` (one primary, three alternates).
- Uses the shared `chat()` helper in `supabase/functions/_shared/ai.ts` with the existing `CHAT_MODEL` (`google/gemini-2.5-flash`), temperature low, JSON-only response.
- Validates output server-side: must be 1–2 grapheme clusters and contain an emoji code point, otherwise falls back to a small keyword map (people, work, home, health, money, ideas, travel, writing) and finally a neutral mark. Never returns arbitrary text.
- Verifies the caller's JWT; no service role needed.

**Hook (`src/hooks/useProjects.ts`)**
- `Project` type in `src/types/note.ts` gains `emoji: string | null`.
- `createProject` inserts the row first (instant UI), then calls `suggest-folder-emoji` and patches the row + local state. Failure is silent.
- New `setProjectEmoji(id, emoji)` doing optimistic local update + `update`.
- Track newly created ids so the rail knows what to animate (returned from `createProject`; the rail holds a short-lived `justCreatedId` state cleared on animation end).

**Sidebar (`src/components/ProjectRail.tsx`)**
- Replace the `·` span with the emoji (or a muted dot when null), wrapped in a button that opens the picker popover.
- New `src/components/FolderEmojiPicker.tsx` — shadcn `Popover`, alternates row + common set + free-text input, all semantic tokens.
- New `src/components/SparkleBurst.tsx` — 3 absolutely-positioned spans animated by new Tailwind keyframes, `pointer-events-none`, unmounted after ~900ms.
- Two keyframes added to `tailwind.config.ts`: `sparkle` (scale/opacity/translate drift) and reuse of existing `fade-up` for the row itself. Wrapped in `motion-safe:` so reduced-motion users skip it.

**Folder page (`src/pages/Index.tsx`)**
- Heading renders the emoji before the folder name, using the same picker.
