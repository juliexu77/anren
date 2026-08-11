# Folder name: pointillist dissolve-in

Replace the current "magnify/blur into place" animation on a newly created folder with a stipple effect: the name first appears as a scatter of tiny dots, which then fill in until the letters are solid.

## What it will look like

1. On creation the folder row appears immediately (no delay).
2. The name is visible only through a fine dot pattern — like ink stippled onto paper — so you read it as grain before you read it as text.
3. Over ~700ms the dots grow and merge, and the last trace of grain settles into clean type.
4. The emoji follows a beat later with the same settle, no scaling or pop.
5. Reduced-motion users see the name plainly, no animation.

## Technical notes

- Add a `stipple-in` keyframe in `tailwind.config.ts` driven by `mask-image` / `-webkit-mask-image`: a repeating `radial-gradient` dot grid (~3px cell) whose dot radius animates from a hairline to full coverage, combined with `mask-size` shrinking slightly and opacity 0 → 1. Because the mask, not the glyph, is animated, the letters never move or scale.
- Layer a second offset dot grid at a different cell size so the grain reads irregular rather than as a visible lattice.
- Register as `animation: "stipple-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both"`.
- In `src/components/ProjectRail.tsx`, swap both `animate-resolve-in` usages for `animate-stipple-in`, keeping the `[animation-delay:180ms]` on the emoji span and the `motion-safe:` guard.
- Check whether `resolve-in` is used anywhere else; if not, remove it from `tailwind.config.ts` along with its `animation` entry.
- Verify in the preview by creating a folder; if the grain is too coarse or too fast, tune cell size and duration only.
