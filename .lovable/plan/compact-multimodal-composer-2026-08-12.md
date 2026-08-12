# Compact multimodal composer

Replace the persistent capture bar ("Talk it through. anren listens and writes it up." + mic + pencil) with a single quiet composer: a real text field plus one clay-rose action button that is a microphone when empty and a save arrow once text exists. Recording, transcription, and note processing stay exactly as they are.

## What changes

**Idle composer**
- Fixed, bottom-centered, restrained max width (matches the existing content column; offset for the desktop rail).
- Paper/ivory surface, hairline border, rounded capsule, no lift shadow, ~60px tall on mobile.
- Left: real text input, placeholder "Write something…", aria-label "Write or paste a note".
- Right: clay-rose circular button, 50px, mic icon, label "Start recording".
- No explanatory copy in the persistent UI.

**Voice**
- Tapping the mic calls the existing `start(folderId)` immediately — no intermediate screen.
- The same container expands in place into the recording state: elapsed time, level ripple on the button, live transcript preview, stop, and a quiet Cancel. Wake lock, durability flushes, recovery banner, and cross-navigation survival are untouched (they live in `RecorderContext` / `useRecordingRecovery`).
- On stop, the container collapses back to idle; the processing note appears in the feed as today.

**Text**
- Typing or pasting any text morphs the mic into a send arrow (label "Save note"); clearing it reverts to the mic. Never both at once.
- Textarea auto-grows to a max of ~140px, then scrolls internally, so long pasted entries are comfortable.
- Enter with a modifier (or the arrow) saves via the existing typed-note insert + `process-note` invoke; the composer clears, blurs, and returns to idle. It stays on the current screen instead of jumping to the note, so quick capture doesn't interrupt reading.
- Title and date are still editable from the note detail screen, so the quick composer stays a single field.

**Overlap / scrolling**
- The composer keeps publishing its measured height to `--capture-bar-h`; `AppShell` content padding becomes `composer height + bottom offset + env(safe-area-inset-bottom) + 28px`, so the last line of any page can sit clearly above it.
- No gradients, blur-over-content, or fades used to hide overlap. The composer's own backdrop blur is dropped in favour of a solid paper surface.

**Empty state**
- The feed's zero-note card copy becomes "Talk or write. Anren will keep the thought and write it up." It disappears once notes exist. No onboarding copy in the composer.

## Technical notes
- Rewrite `src/components/CaptureBar.tsx` as the composer (idle / recording / saving states in one container); keep the `ResizeObserver` height publish and the recovery card.
- `ComposeSheet.tsx` is no longer reachable from the bar; leave the file in place unused rather than touching other flows, or delete it if nothing else imports it (nothing does today).
- `AppShell.tsx`: only the content `paddingBottom` calc changes.
- `Index.tsx`: only the empty-state copy changes.
- Untouched: recorder/audio implementation, transcription, `process-note`, AI prompts, data model, search, folders, On My Mind, typography, palette, navigation.
