// The timebank wordmark: rounded lowercase with the dot of the "i" as a lit arched window.
// With `animated`, the logo tells the product story: letters arrive, the i grows,
// the window drops onto it, flickers and lights up, then keeps breathing softly.

export function WindowMark({ size, glow = "#FFC870", ink = "#1F4A33" }: { size: number; glow?: string; ink?: string }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 10 12" aria-hidden style={{ display: "block", overflow: "visible" }}>
      <path className="wm-pane" d="M1 12 V5 A4 4 0 0 1 9 5 V12Z" fill={glow} stroke={ink} strokeWidth="0.9" strokeLinejoin="round" style={{ ["--lamp" as string]: glow }} />
      <path d="M5 1.6 V12 M1 7.2 H9" stroke={ink} strokeWidth="0.9" />
    </svg>
  );
}

export function Wordmark({
  size = 24,
  ink = "currentColor",
  glow = "#FFC870",
  animated = false,
}: {
  size?: number;
  ink?: string;
  glow?: string;
  animated?: boolean;
}) {
  return (
    <span className={`wordmark ${animated ? "animated" : ""}`} style={{ fontSize: size, color: ink, ["--glow-r" as string]: `${size * 0.09}px` }} aria-label="timebank" role="img">
      <span className="wm-t">t</span>
      <span className="wordmark-i" style={{ background: ink }}>
        <span className="wordmark-dot">
          <WindowMark size={size * 0.24} glow={glow} ink={ink} />
        </span>
      </span>
      <span className="wm-rest">
        {"mebank".split("").map((ch, i) => (
          <span key={i} className="wm-l" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
