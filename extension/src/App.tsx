import { useEffect, useState } from "react";
import ExtensionOnboarding from "./components/ExtensionOnboarding";
import CaptureUI from "./components/CaptureUI";
import { applyWebSessionToExtension, getClient } from "./shared/supabaseClient";
import "./App.css";

type AppState = "loading" | "onboarding" | "capture";

interface PageContext {
  pageTitle?: string;
  pageUrl?: string;
  selectedText?: string;
}

function getChromeStorage() {
  const chromeAny = globalThis as unknown as {
    chrome?: {
      storage?: {
        local?: {
          get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          set: (items: Record<string, unknown>, cb?: () => void) => void;
        };
      };
    };
  };
  return chromeAny.chrome?.storage?.local ?? null;
}

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  useEffect(() => {
    // Read page context for onboarding step 2
    const storage = getChromeStorage();
    if (storage) {
      storage.get(["anren_panel_context"], (items) => {
        const ctx = items.anren_panel_context as PageContext | undefined;
        if (ctx) setPageContext(ctx);
      });
    }

    // Determine if onboarding is needed
    async function checkState() {
      // First check chrome.storage.local for onboarding completion
      const onboardingDone = await new Promise<boolean>((resolve) => {
        if (storage) {
          storage.get(["anren_onboarding_step"], (items) => {
            resolve((items.anren_onboarding_step as number) >= 5);
          });
        } else {
          const saved = localStorage.getItem("anren_onboarding_step");
          resolve(saved ? parseInt(saved, 10) >= 5 : false);
        }
      });

      if (onboardingDone) {
        // Also check we have a valid session
        const supabase = getClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setAppState("capture");
            return;
          }
        }
        // No session but onboarding was done — show onboarding to re-auth
        setAppState("onboarding");
        return;
      }

      setAppState("onboarding");
    }

    checkState();
  }, []);

  // Listen for auth tokens coming from the web app via the content script bridge.
  useEffect(() => {
    const chromeAny = globalThis as unknown as {
      chrome?: {
        runtime?: {
          onMessage: {
            addListener: (
              listener: (
                message: unknown,
                sender: { tab?: { id?: number } },
                sendResponse: (response?: unknown) => void
              ) => void
            ) => void;
            removeListener: (
              listener: (
                message: unknown,
                sender: { tab?: { id?: number } },
                sendResponse: (response?: unknown) => void
              ) => void
            ) => void;
          };
        };
        tabs?: {
          remove: (tabId: number, callback?: () => void) => void;
        };
      };
    };

    const runtime = chromeAny.chrome?.runtime;
    if (!runtime?.onMessage) return;

    const listener = (
      message: any,
      sender: { tab?: { id?: number } },
      sendResponse: (response?: unknown) => void,
    ) => {
      if (!message || message.type !== "ANREN_EXTENSION_AUTH") {
        return;
      }

      const accessToken = message.accessToken as string | undefined;
      const refreshToken = message.refreshToken as string | undefined;
      if (!accessToken || !refreshToken) return;

      (async () => {
        const { error } = await applyWebSessionToExtension({
          accessToken,
          refreshToken,
        });

        if (!error) {
          // We have a valid session now – show the capture UI.
          setAppState("capture");

          // Close the auth tab that initiated this message, if we can.
          const tabs = chromeAny.chrome?.tabs;
          const tabId = sender.tab?.id;
          if (tabs && typeof tabId === "number") {
            try {
              tabs.remove(tabId);
            } catch {
              // Ignore failures to close the tab.
            }
          }
        }

        sendResponse({ ok: !error });
      })();

      // Indicate that we'll respond asynchronously.
      return true;
    };

    runtime.onMessage.addListener(listener);
    return () => {
      runtime.onMessage.removeListener(listener);
    };
  }, []);

  const handleOnboardingComplete = () => {
    setAppState("capture");
  };

  if (appState === "loading") {
    return (
      <div className="anren-panel" style={{ justifyContent: "center", alignItems: "center" }}>
        <span className="onboarding-spinner onboarding-spinner-lg" />
      </div>
    );
  }

  if (appState === "onboarding") {
    return (
      <ExtensionOnboarding
        pageContext={pageContext}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="anren-panel">
      <CaptureUI />
    </div>
  );
}

export default App;
