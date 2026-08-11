/**
 * Free, on-device live transcription for the recording bar.
 *
 * The browser's speech recognition runs locally (and on iOS, through Apple's
 * own recogniser once Anren is native), so the words appearing while someone
 * talks cost nothing. The paid transcription call happens once, on the final
 * recording, and remains the source of truth for the note itself.
 */

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function liveSpeechSupported(): boolean {
  return recognitionCtor() !== null;
}

/**
 * Starts on-device recognition, calling `onText` with the running transcript.
 * Returns a stop function, or null when the browser can't do this — in which
 * case the recording still works, it just shows no words until it's written up.
 */
export function startLiveSpeech(onText: (text: string) => void): (() => void) | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  let settled = "";
  let stopped = false;
  let recognition: SpeechRecognitionLike;

  const attach = () => {
    recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) settled = settled ? `${settled} ${text.trim()}` : text.trim();
        else interim += text;
      }
      onText(`${settled}${interim ? ` ${interim.trim()}` : ""}`.trim());
    };

    recognition.onerror = () => {
      /* stays quiet — the real transcript comes from the saved recording */
    };

    // Browsers end recognition on their own after a pause; pick it back up so
    // the preview keeps flowing for as long as someone is talking.
    recognition.onend = () => {
      if (stopped) return;
      try {
        attach();
      } catch {
        /* give up quietly */
      }
    };

    recognition.start();
  };

  try {
    attach();
  } catch {
    return null;
  }

  return () => {
    stopped = true;
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  };
}
