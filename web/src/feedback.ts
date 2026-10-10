// The "thump" of a seal landing: synthesized, so there is no audio file to load.
export function stampFeedback() {
  // A screen-edge glow accompanies the sound, so the moment is never audio-only.
  document.body.classList.remove("flash");
  void document.body.offsetWidth;
  document.body.classList.add("flash");
  try {
    navigator.vibrate?.([60, 40, 60]);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Sound and vibration are a nicety; ignore if the device blocks them.
  }
}
