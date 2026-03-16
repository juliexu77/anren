

## Default "Resting here" to open

One change: in `HomeView.tsx`, flip the `CollapsibleSection` default state from `useState(false)` to `useState(true)` so the item list is visible immediately on load.

### File: `src/components/HomeView.tsx`
- `CollapsibleSection` component: change `const [open, setOpen] = useState(false)` → `useState(true)`

That's it — the section will render expanded by default, users can still collapse it if they want.

