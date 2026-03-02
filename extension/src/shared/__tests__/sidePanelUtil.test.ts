import { describe, expect, it, vi } from "vitest";
import {
  openSidePanelWithFallback,
  type ChromeSidePanelLike,
  type ChromeTabLike,
} from "../sidePanelUtil";

describe("openSidePanelWithFallback", () => {
  it("uses sidePanel.open when available", async () => {
    const open = vi.fn();
    const setOptions = vi.fn();
    const sidePanel: ChromeSidePanelLike = { open, setOptions };
    const tab: ChromeTabLike = { id: 1, windowId: 5 };

    await openSidePanelWithFallback(tab, sidePanel);

    expect(open).toHaveBeenCalledWith({ windowId: 5 });
    expect(setOptions).not.toHaveBeenCalled();
  });

  it("falls back to setOptions when open is not available", async () => {
    const setOptions = vi.fn();
    const sidePanel: ChromeSidePanelLike = { setOptions };
    const tab: ChromeTabLike = { id: 7, windowId: 9 };

    await openSidePanelWithFallback(tab, sidePanel);

    expect(setOptions).toHaveBeenCalledWith({
      tabId: 7,
      path: "side-panel.html",
      enabled: true,
    });
  });

  it("is safe when sidePanel is absent", async () => {
    await openSidePanelWithFallback({ id: 1, windowId: 1 }, null);
  });
});

