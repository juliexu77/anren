import { useEffect, useState } from "react";
import { getClient } from "./shared/supabaseClient";
import ExtensionOnboarding from "./components/ExtensionOnboarding";
import CaptureUI from "./components/CaptureUI";
import type { User } from "@supabase/supabase-js";
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
