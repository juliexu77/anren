export type ChromeSidePanelLike = {
  open?: (options: { windowId?: number }) => Promise<void> | void;
  setOptions?: (options: {
    tabId?: number;
    path?: string;
    enabled?: boolean;
  }) => Promise<void> | void;
};

export type ChromeTabLike = {
  id?: number;
  windowId?: number;
};

/**
 * Shared utility used conceptually by the background script:
 * - Prefer chrome.sidePanel.open when available (modern Chrome)
 * - Fall back to chrome.sidePanel.setOptions({ enabled: true })
 *   and rely on the user clicking the side panel icon.
 */
export async function openSidePanelWithFallback(
  tab: ChromeTabLike,
  sidePanel: ChromeSidePanelLike | null | undefined,
) {
  if (!sidePanel) return;

  try {
    if (typeof sidePanel.open === "function" && tab.windowId != null) {
      await sidePanel.open({ windowId: tab.windowId });
      return;
    }

    if (typeof sidePanel.setOptions === "function") {
      await sidePanel.setOptions({
        tabId: tab.id,
        path: "side-panel.html",
        enabled: true,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] failed to open side panel with fallback", error);
  }
}

