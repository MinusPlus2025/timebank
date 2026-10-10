// Spoken guidance for people with low vision or who find reading hard.
// Uses the browser's built-in speech synthesis, so it works offline and needs no account.
// Everything spoken is also shown on screen, and every sound has a visual equivalent,
// so nothing depends on hearing alone.
import { useEffect } from "react";
import type { Lang } from "./i18n";

let enabled = false;
let lang: Lang = "zh";

/** Must run inside a tap: iOS only allows speech after the user has started it once. */
export function unlockVoice() {
  if (!voiceSupported()) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

export function configureVoice(on: boolean, l: Lang) {
  enabled = on;
  lang = l;
  if (!on) window.speechSynthesis?.cancel();
}

export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string) {
  announce(text);
  if (!enabled || !voiceSupported()) return;
  const synth = window.speechSynthesis;
  // iOS Safari drops an utterance queued right after cancel(), so give it a moment.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => say(text), 120);
  } else say(text);
}

function say(text: string) {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "zh" ? "zh-CN" : "en-US";
  u.rate = 0.92; // a little slower than default, easier for older listeners
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(u.lang.toLowerCase().slice(0, 2)));
  if (voice) u.voice = voice;
  synth.speak(u);
}

/** Also sent to screen readers through a polite live region. */
function announce(text: string) {
  const el = document.getElementById("live-region");
  if (el) {
    el.textContent = "";
    setTimeout(() => (el.textContent = text), 30);
  }
}

/** Speak a screen's guidance when it appears (and again if the text changes). */
export function useSpeakOnShow(text: string | false | null | undefined) {
  useEffect(() => {
    if (text) speak(text);
  }, [text]);
}
