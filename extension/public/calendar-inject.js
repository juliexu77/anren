// Plain JS content script injected on Google Calendar.
// It adds a slim, inline drawer on the right and loads the Anren UI via an iframe
// that points at side-panel.html inside the extension.

/* global chrome */

console.log("[Anren] calendar-inject content script loaded");

(function injectDrawer() {
  if (document.getElementById("anren-calendar-drawer-root")) {
    return;
  }

  const container = document.createElement("div");
  container.id = "anren-calendar-drawer-root";

  const panel = document.createElement("div");
  panel.id = "anren-calendar-drawer-panel";

  const handle = document.createElement("button");
  handle.id = "anren-calendar-drawer-handle";
  handle.type = "button";
  handle.textContent = "Anren";

  // Base container styles: anchored to the right inside the main calendar area
  Object.assign(container.style, {
    position: "absolute",
    top: "0",
    right: "0",
    height: "100%",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    zIndex: "2147483647",
    pointerEvents: "none", // let clicks fall through except on panel/handle
  });

  // Panel holds the iframe and handles the slide animation
  Object.assign(panel.style, {
    position: "relative",
    height: "100%",
    width: "min(340px, 28vw)",
    maxWidth: "360px",
    minWidth: "260px",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    pointerEvents: "auto",
    transform: "translateX(0)",
    transition: "transform 180ms ease-out, box-shadow 180ms ease-out",
  });

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("side-panel.html");
  Object.assign(iframe.style, {
    border: "none",
    width: "100%",
    height: "100%",
    boxShadow: "0 0 20px rgba(0,0,0,0.35)",
    background: "transparent",
    borderRadius: "0",
  });

  // Slim vertical handle that stays visible when collapsed
  Object.assign(handle.style, {
    position: "absolute",
    left: "-52px",
    top: "50%",
    transform: "translateY(-50%)",
    padding: "6px 10px",
    borderRadius: "999px 0 0 999px",
    border: "1px solid rgba(0,0,0,0.25)",
    background:
      "linear-gradient(135deg, rgba(217, 180, 140, 0.96), rgba(141, 115, 92, 0.96))",
    color: "#f9f5f1",
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
    pointerEvents: "auto",
  });

  panel.appendChild(iframe);
  panel.appendChild(handle);
  container.appendChild(panel);

  const start = () => {
    // Prefer anchoring inside the main calendar area so we don't cover
    // Google's own right-hand rails. Fallback to body if not found.
    const main =
      document.querySelector('div[role="main"]') ||
      document.querySelector("main") ||
      document.body;

    if (!main.contains(container)) {
      const mainStyle = window.getComputedStyle(main);
      if (mainStyle.position === "static") {
        main.style.position = "relative";
      }
      main.appendChild(container);
    }

    const STORAGE_KEY = "anrenDrawerOpen";

    const applyState = (isOpen) => {
      container.setAttribute("data-open", String(isOpen));
      if (isOpen) {
        panel.style.transform = "translateX(0)";
      } else {
        // Keep the handle visible while the panel is collapsed.
        panel.style.transform = "translateX(calc(100% - 52px))";
      }
    };

    // Default: open unless the user explicitly closed it before.
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        const isOpen =
          typeof result[STORAGE_KEY] === "boolean"
            ? result[STORAGE_KEY]
            : true;
        applyState(isOpen);
      });
    } else {
      applyState(true);
    }

    handle.addEventListener("click", () => {
      const current = container.getAttribute("data-open") === "true";
      const next = !current;
      applyState(next);
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ [STORAGE_KEY]: next });
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

