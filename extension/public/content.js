/**
 * ANREN extension content script.
 *
 * Runs on the Anren web app domain and forwards auth messages
 * from the web page to the extension runtime.
 */

// Shape of the message we expect from the web app.
// {
//   source: "anren-web",
//   type: "ANREN_EXTENSION_AUTH",
//   accessToken: string,
//   refreshToken: string
// }

window.addEventListener("message", function (event) {
  // Only accept messages from the same window
  if (event.source !== window) return;

  var data = event.data;
  if (!data) return;
  if (data.source !== "anren-web" || data.type !== "ANREN_EXTENSION_AUTH") return;
  if (!data.accessToken || !data.refreshToken) return;

  try {
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) return;

    chrome.runtime.sendMessage(
      {
        type: "ANREN_EXTENSION_AUTH",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
      function () {
        // Ignore any response – this is just a bridge.
      }
    );
  } catch (e) {
    // Swallow errors – worst case, the extension just won't pick up the session.
    // console.error("[Anren] content script bridge error", e);
  }
});

