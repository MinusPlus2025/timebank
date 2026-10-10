import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Strings } from "./i18n";
import type { Phase } from "./theme";
import { Garland, PaperPlane, WindowTile, spring } from "./Windows";

/** Scene 1: a block of windows, lights coming on one by one. */
export function Street({ phase }: { phase: Phase }) {
  const tiles = [7, 0, 8, 2, 4, 7, 3, 8, 1];
  return (
    <div className="onb-street">
      {tiles.map((t, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.05 }}>
          <WindowTile phase={phase} tile={t} lightAt={t < 7 ? 0.6 + i * 0.18 : undefined} lit={t < 7} />
        </motion.div>
      ))}
    </div>
  );
}

/** Three short scenes that explain the idea before anyone is asked for Face ID. */
export function Onboarding({ s, phase, onDone }: { s: Strings; phase: Phase; onDone: () => void }) {
  const [i, setI] = useState(0);
  const slide = s.onboarding[i];
  const last = i === s.onboarding.length - 1;
  return (
    <main className="onboarding">
      <div className="onb-art">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            className="onb-scene"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={spring}
          >
            {i === 0 && <Street phase={phase} />}
            {i === 1 && <Garland phase={phase} left={6} right={3} />}
            {i === 2 && <PaperPlane phase={phase} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="onb-copy"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ ...spring, delay: 0.08 }}
        >
          <h1>
            {slide.title.split("\n").map((line, k) => (
              <span key={k}>{line}</span>
            ))}
          </h1>
          <p>{slide.body}</p>
        </motion.div>
      </AnimatePresence>
      <div className="onb-foot">
        <div className="dots" aria-hidden>
          {s.onboarding.map((_, k) => (
            <motion.span key={k} animate={{ width: k === i ? 26 : 8, opacity: k === i ? 1 : 0.35 }} transition={spring} />
          ))}
        </div>
        <div className="onb-actions">
          {!last && (
            <button className="link" onClick={onDone}>
              {s.skip}
            </button>
          )}
          <motion.button whileTap={{ scale: 0.95 }} className="primary small" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? s.begin : s.next}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
