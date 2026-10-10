// Spoken guidance for people with low vision or who find reading hard.
// Uses the browser's built-in speech synthesis, so it works offline and needs no account.
// Everything spoken is also shown on screen, and every sound has a visual equivalent,
// so nothing depends on hearing alone.
//
// iOS Safari only lets a page speak after one utterance has been started synchronously
// inside a tap, and that unlock is lost on every page load. So until a tap has happened,
// the latest guidance is kept and spoken by the first tap anywhere on the page.
import { useEffect } from "react";
import type { Lang } from "./i18n";

let enabled = false;
let lang: Lang = "zh";
let unlocked = false;
let pending = "";

export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function onFirstTap() {
  if (unlocked || !enabled) return;
  // Synchronous on purpose: this call is what iOS counts as user-initiated speech.
  say(pending || " ");
  unlocked = true;
  pending = "";
}

if (voiceSupported()) {
  for (const type of ["pointerup", "touchend", "keydown"]) document.addEventListener(type, onFirstTap, { capture: true });
}

export function configureVoice(on: boolean, l: Lang) {
  enabled = on;
  lang = l;
  if (!on && voiceSupported()) window.speechSynthesis.cancel();
}

/** Call from inside the tap that turns voice on, so the first words count as user-initiated. */
export function speakFromTap(text: string) {
  announce(text);
  if (!voiceSupported()) return;
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) synth.cancel();
  say(text);
  unlocked = true;
  pending = "";
}

export function speak(text: string) {
  announce(text);
  if (!enabled || !voiceSupported()) return;
  if (!unlocked) {
    pending = text;
    return;
  }
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) {
    synth.cancel();
    // iOS Safari drops an utterance queued in the same tick as cancel().
    setTimeout(() => say(text), 150);
  } else say(text);
}

function pickVoice(code: string) {
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === code.toLowerCase());
  const pool = exact.length ? exact : voices.filter((v) => v.lang.toLowerCase().startsWith(code.slice(0, 2)));
  return pool.find((v) => v.localService) ?? pool[0];
}

function say(text: string) {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "zh" ? "zh-CN" : "en-US";
  u.rate = 0.92; // a little slower than default, easier for older listeners
  u.volume = 1;
  const voice = pickVoice(u.lang);
  if (voice) u.voice = voice;
  // Chrome can get stuck paused after the tab was in the background.
  synth.resume();
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
