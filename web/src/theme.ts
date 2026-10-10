import { useEffect, useState } from "react";

export type Phase = "day" | "night";

/** Day or night by the viewer's own local clock, so everyone sees their own sky. */
export function currentPhase(date = new Date()): Phase {
  const h = date.getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

export function usePhase(override: Phase | null): Phase {
  const [phase, setPhase] = useState<Phase>(() => currentPhase());
  useEffect(() => {
    const t = setInterval(() => setPhase(currentPhase()), 60_000);
    return () => clearInterval(t);
  }, []);
  return override ?? phase;
}

/**
 * Illustration packs, so the neighbours on screen look like the viewer's own neighbourhood.
 * Each pack is a pair of sheets: /img/windows-<pack>-day-sheet.webp and ...-night-sheet.webp.
 * "global" is the mixed, many-cultures set used when no regional pack exists yet.
 */
export const AVAILABLE_PACKS = ["global"] as const;

const REGION_BY_LANG: Record<string, string> = {
  zh: "east-asia", ja: "east-asia", ko: "east-asia",
  hi: "south-asia", bn: "south-asia", ta: "south-asia", ur: "south-asia",
  ar: "mena", fa: "mena", tr: "mena", he: "mena",
  sw: "africa", yo: "africa", am: "africa", zu: "africa", ha: "africa",
  es: "latam", pt: "latam",
  id: "southeast-asia", ms: "southeast-asia", th: "southeast-asia", vi: "southeast-asia", tl: "southeast-asia",
};

export function illustrationPack(): string {
  const lang = (navigator.language || "en").toLowerCase().split("-")[0];
  const region = REGION_BY_LANG[lang] ?? "global";
  return (AVAILABLE_PACKS as readonly string[]).includes(region) ? region : "global";
}
