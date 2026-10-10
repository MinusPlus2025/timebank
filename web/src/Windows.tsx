// The neighbourhood: window tiles cut from illustrated sheets (day and night), animated with springs.
// Sheet layout, 3x3 in reading order:
// 0 volunteer helping an elder with a phone · 1 bringing soup · 2 reading with a child
// 3 fixing a lamp · 4 tea, one neighbour in a wheelchair · 5 grandmother with a cat (family)
// 6 young person waving (you) · 7 empty window, plant (dark at night) · 8 empty window (dark)
import { Children, isValidElement, useEffect, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type Variants } from "framer-motion";
import { illustrationPack, type Phase } from "./theme";

const pack = illustrationPack();
const sheet = (phase: Phase) => (pack === "global" ? `/img/windows-${phase}-sheet.webp` : `/img/windows-${pack}-${phase}-sheet.webp`);

export const TILE = { you: 6, family: 5, unlit: [7, 8] } as const;
export const spring = { type: "spring", stiffness: 260, damping: 24 } as const;
const soft = { type: "spring", stiffness: 140, damping: 20 } as const;

function TileImage({ phase, tile, style }: { phase: Phase; tile: number; style?: CSSProperties }) {
  return (
    <span
      className="tile"
      style={{
        backgroundImage: `url(${sheet(phase)})`,
        backgroundPosition: `${(tile % 3) * 50}% ${Math.floor(tile / 3) * 50}%`,
        ...style,
      }}
    />
  );
}

/**
 * One window. With `lightAt`, it starts as an empty, unlit window and then lights up:
 * the scene fades in over the empty window, so the wall never flashes.
 */
export function WindowTile({
  phase,
  tile,
  lit = true,
  lightAt,
  label,
  onClick,
  layoutId,
}: {
  phase: Phase;
  tile: number;
  lit?: boolean;
  lightAt?: number;
  label?: string;
  onClick?: () => void;
  layoutId?: string;
}) {
  const content = (
    <>
      {lightAt !== undefined && <TileImage phase={phase} tile={TILE.unlit[tile % 2]} />}
      <motion.span
        className="tile-layer"
        initial={lightAt !== undefined ? { opacity: 0, scale: 0.94 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...soft, delay: lightAt ?? 0 }}
      >
        <TileImage phase={phase} tile={lit ? tile : TILE.unlit[tile % 2]} />
      </motion.span>
    </>
  );
  if (!onClick)
    return (
      <motion.span layoutId={layoutId} className="tile-wrap" role={label ? "img" : undefined} aria-label={label}>
        {content}
      </motion.span>
    );
  return (
    <motion.button
      layoutId={layoutId}
      className="tile-wrap tile-button"
      onClick={onClick}
      aria-label={label}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={spring}
    >
      {content}
    </motion.button>
  );
}

const facadeVariants: Variants = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } };
const rowItem: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: soft },
};

/** The building front: a roofline, then windows that rise into place one after another. */
export function Facade({ children }: { children: ReactNode }) {
  return (
    <motion.section className="facade" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={soft}>
      <motion.div className="cornice" aria-hidden initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ ...soft, delay: 0.05 }} />
      <motion.div className="facade-grid" variants={facadeVariants} initial="hidden" animate="show">
        {Children.toArray(children).map((child, i) => (
          <motion.div key={isValidElement(child) && child.key != null ? child.key : i} variants={rowItem}>
            {child}
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

/** Rolls a number up from zero, like a counter settling. */
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.b>{text}</motion.b>;
}

/** Small warm lights drifting upward, used when something good happens. */
function Embers({ count = 10 }: { count?: number }) {
  return (
    <span className="embers" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const x = 10 + ((i * 37) % 80);
        return (
          <motion.span
            key={i}
            className="ember"
            style={{ left: `${x}%` }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -90 - (i % 3) * 30, opacity: [0, 1, 0], scale: 1 }}
            transition={{ duration: 2.2, delay: 1.3 + i * 0.12, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

/** Two windows slide together and a string of lights switches on between them. */
export function Garland({ phase, left, right }: { phase: Phase; left: number; right: number }) {
  const bulbs = [0.12, 0.27, 0.42, 0.58, 0.73, 0.88];
  return (
    <div className="garland-scene">
      <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}>
        <WindowTile phase={phase} tile={left} />
      </motion.div>
      <svg className="garland" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <motion.path
          className="garland-wire"
          d="M0 6 Q50 42 100 6"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.35, ease: "easeInOut" }}
        />
        {bulbs.map((t, i) => (
          <motion.circle
            key={i}
            cx={t * 100}
            cy={6 + 2 * (1 - t) * t * 36 + 3}
            r="2.8"
            initial={{ scale: 0, fill: "#d9d2c5" }}
            animate={{ scale: 1, fill: "#f2b84b" }}
            transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.85 + i * 0.12 }}
            style={{ transformOrigin: `${t * 100}px ${6 + 2 * (1 - t) * t * 36 + 3}px` }}
          />
        ))}
      </svg>
      <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}>
        <WindowTile phase={phase} tile={right} lightAt={0.5} />
      </motion.div>
      <Embers />
    </div>
  );
}

/** A paper plane flies from your window; your family's window lights up when it lands. */
export function PaperPlane({ phase }: { phase: Phase }) {
  // Points along a gentle arc, as fractions of the scene box.
  const xs = ["14%", "32%", "50%", "68%", "80%"];
  const ys = ["58%", "18%", "8%", "20%", "46%"];
  return (
    <div className="plane-scene">
      <WindowTile phase={phase} tile={TILE.you} />
      <span />
      <WindowTile phase={phase} tile={TILE.family} lightAt={1.6} />
      <motion.span
        className="plane"
        aria-hidden
        initial={{ left: xs[0], top: ys[0], rotate: -30, opacity: 0, scale: 0.7 }}
        animate={{ left: xs, top: ys, rotate: [-30, -10, 5, 20, 35], opacity: [0, 1, 1, 1, 0], scale: [0.7, 1, 1, 0.9, 0.5] }}
        transition={{ duration: 1.5, delay: 0.25, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path d="M2 11 L22 3 L15 21 L11 13 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M11 13 L22 3" stroke="var(--ink)" strokeWidth="1.2" />
        </svg>
      </motion.span>
      <Embers count={6} />
    </div>
  );
}

/** A front door that swings open with warm light once the visitor is verified. */
export function Door({ open, children }: { open: boolean; children?: ReactNode }) {
  return (
    <div className="door-scene">
      <div className="door-light">{children}</div>
      <motion.div
        className="door-panel"
        aria-hidden
        initial={false}
        animate={{ rotateY: open ? -105 : -58 }}
        transition={{ type: "spring", stiffness: 70, damping: 14 }}
      >
        <span className="door-knob" />
      </motion.div>
      {open && <Embers count={8} />}
    </div>
  );
}
