/**
 * Keep the screen awake while recording.
 *
 * Two layers, because iPhones are picky:
 *  1. Screen Wake Lock API — Safari 16.4+, Chrome, Edge. The real thing.
 *  2. A tiny muted looping video played inline — the old NoSleep.js trick.
 *     Older iOS versions keep the display on while a video is playing, so this
 *     covers phones that never got the Wake Lock API.
 *
 * Either layer can vanish when the tab is backgrounded, so `keepScreenAwake`
 * re-acquires on visibilitychange until it is released.
 */

type SentinelLike = { release: () => Promise<void>; addEventListener?: (t: string, fn: () => void) => void };

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<SentinelLike> };
};

export type WakeLockHandle = { release: () => void };

// A ~1s silent black webm/mp4 is not needed: an empty canvas-captured stream is
// unreliable on iOS, so we use a data-URI mp4 that plays inline and loops.
const TINY_MP4 =
  "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAr1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjY0MyA1YzY1NzA0IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbAAAAAFljb3B5cmlnaHQAAAAAAAABAAAAFHN0c3MAAAAAAAAAAQAAAAE=";

function makeVideo(): HTMLVideoElement {
  const video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("title", "");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.width = 1;
  video.height = 1;
  video.style.position = "fixed";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.style.bottom = "0";
  video.style.left = "0";
  video.src = TINY_MP4;
  return video;
}

/**
 * Ask the device to stay awake. Call the returned `release` when the recording
 * (or whatever needed the screen) is finished.
 */
export function keepScreenAwake(): WakeLockHandle {
  let released = false;
  let sentinel: SentinelLike | null = null;
  let video: HTMLVideoElement | null = null;

  const acquire = async () => {
    if (released || document.visibilityState !== "visible") return;

    const nav = navigator as WakeLockNavigator;
    if (nav.wakeLock && !sentinel) {
      try {
        const held = await nav.wakeLock.request("screen");
        if (released) {
          void held.release().catch(() => undefined);
          return;
        }
        sentinel = held;
        held.addEventListener?.("release", () => {
          sentinel = null;
        });
        return;
      } catch {
        /* fall through to the video fallback */
      }
    }

    if (!video) video = makeVideo();
    if (!video.isConnected) document.body.appendChild(video);
    try {
      await video.play();
    } catch {
      /* autoplay refused — nothing more we can do from the web */
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") void acquire();
  };

  void acquire();
  document.addEventListener("visibilitychange", onVisibility);

  return {
    release() {
      if (released) return;
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => undefined);
      sentinel = null;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.remove();
        video = null;
      }
    },
  };
}
