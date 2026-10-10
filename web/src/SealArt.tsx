// Generative seal artwork. The same on-chain seed renders as a carved square seal
// (East Asian tradition) or a round wax seal (European tradition), depending on language.
import { useMemo } from "react";
import type { Hex } from "viem";
import { CATEGORIES, type Lang } from "./i18n";

function rng(seed: Hex) {
  // Small deterministic PRNG (mulberry32) seeded from the on-chain seed.
  let a = parseInt(seed.slice(2, 10), 16) ^ parseInt(seed.slice(-8), 16);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roughPath(cx: number, cy: number, points: [number, number][], jitter: number, rand: () => number) {
  return (
    points
      .map(([x, y], i) => `${i ? "L" : "M"}${(cx + x + (rand() - 0.5) * jitter).toFixed(1)},${(cy + y + (rand() - 0.5) * jitter).toFixed(1)}`)
      .join(" ") + "Z"
  );
}

type Props = { seed: Hex; category: number; lang: Lang; size?: number; animate?: boolean; label?: string };

export function SealArt({ seed, category, lang, size = 160, animate = false, label }: Props) {
  const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const art = useMemo(() => {
    const rand = rng(seed);
    const tilt = (rand() - 0.5) * 8;
    const filterId = `ink-${seed.slice(2, 10)}`;
    const turbulenceSeed = Math.floor(rand() * 1000);
    if (lang === "zh") {
      // Square carved seal: border with worn edges, 2x2 characters.
      const edge: [number, number][] = [];
      for (let i = 0; i <= 12; i++) edge.push([-46 + (92 * i) / 12, -46]);
      for (let i = 1; i <= 12; i++) edge.push([46, -46 + (92 * i) / 12]);
      for (let i = 1; i <= 12; i++) edge.push([46 - (92 * i) / 12, 46]);
      for (let i = 1; i < 12; i++) edge.push([-46, 46 - (92 * i) / 12]);
      const chips = Array.from({ length: 3 + Math.floor(rand() * 4) }, () => ({
        x: rand() * 92 - 46,
        y: rand() < 0.5 ? -46 : 46,
        r: 1 + rand() * 2.5,
      }));
      const chars = ["时", "光", cat.glyph, "印"];
      return { tilt, filterId, turbulenceSeed, edge: roughPath(0, 0, edge, 2.2, rand), chips, chars };
    }
    // Round wax seal: irregular blob, ring and an initial.
    const blob: [number, number][] = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const r = 46 + (rand() - 0.5) * 6;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    return { tilt, filterId, turbulenceSeed, edge: roughPath(0, 0, blob, 1.5, rand), chips: [], chars: [cat.letter] };
  }, [seed, cat, lang]);

  const zh = lang === "zh";
  return (
    <svg
      className={animate ? "seal stamp" : "seal"}
      width={size}
      height={size}
      viewBox="-55 -55 110 110"
      role="img"
      aria-label={label ?? (zh ? `印章：${cat.zh}` : `Seal: ${cat.en}`)}
      style={{ transform: `rotate(${art.tilt}deg)` }}
    >
      <defs>
        <filter id={art.filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={art.turbulenceSeed} />
          <feDisplacementMap in="SourceGraphic" scale={zh ? 2.5 : 1.5} />
        </filter>
        {!zh && (
          <radialGradient id={`${art.filterId}-wax`} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#c8443c" />
            <stop offset="100%" stopColor="#7d1a17" />
          </radialGradient>
        )}
      </defs>
      <g filter={`url(#${art.filterId})`}>
        {zh ? (
          <>
            <path d={art.edge} fill="var(--seal)" />
            <rect x="-40" y="-40" width="80" height="80" fill="none" stroke="var(--paper)" strokeWidth="2.2" />
            {art.chars.map((ch, i) => (
              <text
                key={i}
                x={i < 2 ? 18 : -18}
                y={i % 2 === 0 ? -4 : 32}
                textAnchor="middle"
                fontSize="34"
                fontFamily="'STKaiti','KaiTi','Kaiti SC','Songti SC','Noto Serif SC',serif"
                fontWeight="700"
                fill="var(--paper)"
              >
                {ch}
              </text>
            ))}
            {art.chips.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="var(--paper)" />
            ))}
          </>
        ) : (
          <>
            <path d={art.edge} fill={`url(#${art.filterId}-wax)`} />
            <circle r="34" fill="none" stroke="#f2c7a5" strokeOpacity="0.55" strokeWidth="1.5" />
            <circle r="27" fill="none" stroke="#5a0f0d" strokeOpacity="0.5" strokeWidth="1" />
            <text y="12" textAnchor="middle" fontSize="34" fontFamily="Georgia,'Times New Roman',serif" fontStyle="italic" fill="#f2c7a5" fillOpacity="0.9">
              {art.chars[0]}
            </text>
            <path id={`${art.filterId}-ring`} d="M-39,0 A39,39 0 0 1 39,0" fill="none" />
            <text fontSize="6.5" letterSpacing="2.5" fill="#f2c7a5" fillOpacity="0.75">
              <textPath href={`#${art.filterId}-ring`} startOffset="50%" textAnchor="middle">
                TIME · BANK
              </textPath>
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
