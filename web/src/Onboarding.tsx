import { useState } from "react";
import type { Strings } from "./i18n";
import type { Phase } from "./theme";

/** Three short scenes that explain the idea before anyone is asked for Face ID. */
export function Onboarding({ s, phase, onDone }: { s: Strings; phase: Phase; onDone: () => void }) {
  const [i, setI] = useState(0);
  const slide = s.onboarding[i];
  const last = i === s.onboarding.length - 1;
  return (
    <main className="onboarding">
      <div className="onb-art" key={`art-${i}`}>
        <img src={`/img/facade-${i === 1 ? (phase === "day" ? "night" : "day") : phase}.webp`} alt="" />
      </div>
      <div className="onb-copy" key={`copy-${i}`}>
        <h1>
          {slide.title.split("\n").map((line, k) => (
            <span key={k}>{line}</span>
          ))}
        </h1>
        <p>{slide.body}</p>
      </div>
      <div className="onb-foot">
        <div className="dots" aria-hidden>
          {s.onboarding.map((_, k) => (
            <span key={k} className={k === i ? "on" : ""} />
          ))}
        </div>
        <div className="onb-actions">
          {!last && (
            <button className="link" onClick={onDone}>
              {s.skip}
            </button>
          )}
          <button className="primary small" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? s.begin : s.next}
          </button>
        </div>
      </div>
    </main>
  );
}
