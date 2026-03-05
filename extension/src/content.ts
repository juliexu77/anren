/**
 * ANREN extension content script.
 *
 * Listens for auth messages from the web app and forwards them to the extension.
 */

type WebAuthMessage = {
  source: "anren-web";
  type: "ANREN_EXTENSION_AUTH";
  accessToken: string;
  refreshToken: string;
};

window.addEventListener("message", (event: MessageEvent) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const data = event.data as WebAuthMessage | undefined;
  if (!data) return;
  if (data.source !== "anren-web" || data.type !== "ANREN_EXTENSION_AUTH") return;
  if (!data.accessToken || !data.refreshToken) return;

  try {
    const chromeAny = globalThis as unknown as {
      chrome?: {
        runtime?: {
          sendMessage: (
            message: unknown,
            responseCallback?: (response: unknown) => void
          ) => void;
        };
      };
    };

    chromeAny.chrome?.runtime?.sendMessage(
      {
        type: "ANREN_EXTENSION_AUTH",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
      // Ignore any response/errors – this is fire-and-forget for the bridge
      () => {}
    );
  } catch {
    // Swallow errors – worst case, the extension just won't pick up the session.
  }
});
