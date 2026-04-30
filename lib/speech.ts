"use client";

// Web Speech API helpers — STT (SpeechRecognition) + TTS (SpeechSynthesis).
// Feature-detected. Chrome/Edge ship both; Safari/Firefox have partial support.
// SSR-safe: every call guards on `typeof window`.

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: { resultIndex: number; results: SRResultList }) => void)
    | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SRResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    length: number;
    [index: number]: { transcript: string; confidence: number };
  };
};

type SRCtor = new () => SpeechRecognitionLike;

type WindowWithSR = Window & {
  SpeechRecognition?: SRCtor;
  webkitSpeechRecognition?: SRCtor;
};

function getRecognitionCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithSR;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export type RecognitionHandle = {
  stop: () => void;
  abort: () => void;
};

/**
 * Start a continuous, interim-result speech recognition session.
 * Returns null if SpeechRecognition is unavailable or fails to start.
 */
export function startRecognition(handlers: {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
  lang?: string;
}): RecognitionHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = handlers.lang ?? "en-US";

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) {
        if (text.trim()) handlers.onFinal?.(text.trim());
      } else {
        interim += text;
      }
    }
    if (interim) handlers.onInterim?.(interim.trim());
  };
  rec.onerror = (event) => {
    handlers.onError?.(event.error ?? "unknown");
  };
  rec.onend = () => {
    handlers.onEnd?.();
  };

  try {
    rec.start();
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : "start failed");
    return null;
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        // noop
      }
    },
    abort: () => {
      try {
        rec.abort();
      } catch {
        // noop
      }
    },
  };
}

export type SpeakOpts = {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
};

/**
 * Cancel any in-flight speech and speak `text`. Returns true if speech was
 * scheduled, false if SpeechSynthesis is unavailable or text is empty.
 */
export function speak(text: string, opts: SpeakOpts = {}): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  cancelSpeech();
  const utter = new SpeechSynthesisUtterance(trimmed);
  if (opts.voice) utter.voice = opts.voice;
  utter.rate = opts.rate ?? 1.0;
  utter.pitch = opts.pitch ?? 1.0;
  utter.onstart = () => opts.onStart?.();
  utter.onend = () => opts.onEnd?.();
  utter.onerror = (e) => {
    const err = (e as SpeechSynthesisErrorEvent).error ?? "speech error";
    opts.onError?.(err);
  };
  window.speechSynthesis.speak(utter);
  return true;
}

export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

/**
 * Strip Markdown syntax + code blocks so TTS reads the prose naturally
 * instead of literally pronouncing every backtick and asterisk.
 */
export function stripForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " — code snippet — ")
    .replace(/`[^`]+`/g, (m) => ` ${m.slice(1, -1)} `)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
