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
    // #region agent log
    fetch('http://127.0.0.1:7930/ingest/47541dce-e71a-46a9-a7f1-617457b3db45',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Debug-Session-Id':'f4b487',
      },
      body:JSON.stringify({
        sessionId:'f4b487',
        runId:'auth-flow',
        hypothesisId:'H3',
        location:'extension/public/content.js:messageListener',
        message:'Content script received ANREN_EXTENSION_AUTH',
        data:{ hasAccessToken: !!data.accessToken, hasRefreshToken: !!data.refreshToken },
        timestamp:Date.now(),
      }),
    }).catch(()=>{});
    // #endregion
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

