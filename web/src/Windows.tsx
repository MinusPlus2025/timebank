// The neighbourhood: window tiles cut from two illustrated sheets (day and night).
// Sheet layout, 3x3 in reading order:
// 0 volunteer helping an elder with a phone · 1 bringing soup · 2 reading with a child
// 3 fixing a lamp · 4 tea, one neighbour in a wheelchair · 5 grandmother with a cat (family)
// 6 young person waving (you) · 7 empty window, plant (dark at night) · 8 empty window (dark)
import type { CSSProperties, ReactNode } from "react";
import { illustrationPack, type Phase } from "./theme";

const pack = illustrationPack();
const sheet = (phase: Phase) => (pack === "global" ? `/img/windows-${phase}-sheet.webp` : `/img/windows-${pack}-${phase}-sheet.webp`);

export const TILE = { you: 6, family: 5, unlit: [7, 8] } as const;

export function WindowTile({
  phase,
  tile,
  lit = true,
  label,
  onClick,
  fresh = false,
  style,
}: {
  phase: Phase;
  tile: number;
  lit?: boolean;
  label?: string;
  onClick?: () => void;
  fresh?: boolean;
  style?: CSSProperties;
}) {
  const col = tile % 3;
  const row = Math.floor(tile / 3);
  const inner = (
    <span
      className={`tile ${lit ? "lit" : "unlit"} ${fresh ? "fresh" : ""}`}
      style={{
        backgroundImage: `url(${sheet(phase)})`,
        backgroundPosition: `${col * 50}% ${row * 50}%`,
        ...style,
      }}
    />
  );
  if (!onClick) return <span className="tile-wrap" aria-label={label} role={label ? "img" : undefined}>{inner}</span>;
  return (
    <button className="tile-wrap tile-button" onClick={onClick} aria-label={label}>
      {inner}
    </button>
  );
}

/** The building front: a roofline, then rows of windows. */
export function Facade({ children }: { children: ReactNode }) {
  return (
    <section className="facade">
      <div className="cornice" aria-hidden />
      <div className="facade-grid">{children}</div>
    </section>
  );
}

/** Two windows joined by a string of lights that switch on one by one. */
export function Garland({ phase, left, right }: { phase: Phase; left: number; right: number }) {
  const bulbs = [0.12, 0.27, 0.42, 0.58, 0.73, 0.88];
  return (
    <div className="garland-scene">
      <WindowTile phase={phase} tile={left} fresh />
      <svg className="garland" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <path className="garland-wire" d="M0 6 Q50 42 100 6" fill="none" />
        {bulbs.map((t, i) => {
          const x = t * 100;
          const y = 6 + 2 * (1 - t) * t * 36;
          return <circle key={i} className="bulb" cx={x} cy={y + 3} r="2.6" style={{ animationDelay: `${0.6 + i * 0.15}s` }} />;
        })}
      </svg>
      <WindowTile phase={phase} tile={right} fresh />
    </div>
  );
}

/** A paper plane flies from your window to your family's. */
export function PaperPlane({ phase }: { phase: Phase }) {
  return (
    <div className="plane-scene">
      <WindowTile phase={phase} tile={TILE.you} />
      <svg className="plane-path" viewBox="0 0 100 60" aria-hidden>
        <path d="M8 46 Q50 -10 92 30" fill="none" strokeDasharray="2 3" />
      </svg>
      <span className="plane" aria-hidden>
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path d="M2 11 L22 3 L15 21 L11 13 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M11 13 L22 3" stroke="var(--ink)" strokeWidth="1.2" />
        </svg>
      </span>
      <WindowTile phase={phase} tile={TILE.family} fresh />
    </div>
  );
}

/** A front door that swings open with warm light once the visitor is verified. */
export function Door({ open, children }: { open: boolean; children?: ReactNode }) {
  return (
    <div className={`door-scene ${open ? "open" : ""}`}>
      <div className="door-light">{children}</div>
      <div className="door-panel" aria-hidden>
        <span className="door-knob" />
      </div>
    </div>
  );
}
