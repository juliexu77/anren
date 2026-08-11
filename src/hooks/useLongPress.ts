import { useRef, useState } from "react";

/**
 * A press that lingers opens the menu; a quick tap still follows the link.
 * Kept deliberately forgiving — a little finger drift shouldn't cancel it.
 */
export function useLongPress(onLongPress: () => void, delay = 500) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [fired, setFired] = useState(false);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };

  return {
    /** True when the last press was long — use it to swallow the click. */
    justFired: () => fired,
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        start.current = { x: touch.clientX, y: touch.clientY };
        setFired(false);
        timer.current = window.setTimeout(() => {
          setFired(true);
          onLongPress();
        }, delay);
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (!start.current) return;
        const touch = e.touches[0];
        const moved =
          Math.abs(touch.clientX - start.current.x) > 10 ||
          Math.abs(touch.clientY - start.current.y) > 10;
        if (moved) clear();
      },
      onTouchEnd: clear,
      onTouchCancel: clear,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        setFired(true);
        onLongPress();
      },
      onClick: (e: React.MouseEvent) => {
        if (fired) {
          e.preventDefault();
          e.stopPropagation();
          setFired(false);
        }
      },
    },
  };
}
