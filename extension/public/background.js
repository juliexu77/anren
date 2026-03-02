// Background service worker for the Anren Chrome MV3 extension.
// Responsible for wiring the side panel to Google Calendar and Gmail
// and opening it with defensive fallbacks across Chrome versions.

/**
 * Opens the side panel for the given tab, using chrome.sidePanel.open
 * when available and falling back to chrome.sidePanel.setOptions({ enabled: true })
 * so the user can open the panel from the side panel icon.
 *
 * @param {chrome.tabs.Tab} tab
 */
async function openSidePanelForTab(tab) {
  if (!chrome.sidePanel) {
    // Side panel API not available in this Chrome version.
    return;
  }

  try {
    // Modern Chrome: prefer explicit open if supported.
    if (typeof chrome.sidePanel.open === "function") {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      return;
    }

    // Fallback: enable the side panel for this tab and rely on the user
    // to click the side panel icon to reveal it.
    if (typeof chrome.sidePanel.setOptions === "function") {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "side-panel.html",
        enabled: true,
      });
    }
  } catch (error) {
    console.error("Anren: failed to open side panel", error);
  }
}

// Enable the side panel on relevant hosts when tabs finish loading.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!chrome.sidePanel || typeof chrome.sidePanel.setOptions !== "function") {
    return;
  }

  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  const allowedOrigins = [
    "https://calendar.google.com/",
    "https://mail.google.com/",
  ];

  const isAllowed = allowedOrigins.some((origin) =>
    tab.url.startsWith(origin),
  );

  if (!isAllowed) {
    return;
  }

  chrome.sidePanel
    .setOptions({
      tabId,
      path: "side-panel.html",
      enabled: true,
    })
    .catch((error) => {
      console.error("Anren: failed to set side panel options", error);
    });
});

async function captureContextForTab(tab) {
  if (!tab || !tab.id || !tab.url) return;

  const pageTitle = tab.title || "";
  const pageUrl = tab.url;

  let selectedText = "";

  try {
    if (chrome.scripting && typeof chrome.scripting.executeScript === "function") {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || "",
      });

      if (Array.isArray(results) && results[0] && typeof results[0].result === "string") {
        selectedText = results[0].result;
      }
    }
  } catch (error) {
    console.error("Anren: failed to capture selection", error);
  }

  try {
    await chrome.storage.local.set({
      anren_panel_context: {
        pageTitle,
        pageUrl,
        selectedText,
      },
    });
  } catch (error) {
    console.error("Anren: failed to store panel context", error);
  }
}

// When the user clicks the extension action icon, open the side panel from
// the user gesture and kick off context capture in the background.
chrome.action.onClicked.addListener((tab) => {
  if (!tab) return;
  openSidePanelForTab(tab);
  // Fire-and-forget; we don't await this so sidePanel.open() stays within
  // the user gesture call stack.
  captureContextForTab(tab);
});

