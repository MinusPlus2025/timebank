import { useEffect, useState } from "react";

export type Phase = "day" | "night";

/** Day or night by the viewer's own local clock, so everyone sees their own sky. */
export function currentPhase(date = new Date()): Phase {
  const h = date.getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

/** What the viewer chose: follow their clock (default), follow the phone's dark mode, or fix it. */
export type ThemePref = "time" | "system" | "day" | "night";
export const THEME_PREFS: ThemePref[] = ["time", "system", "day", "night"];

const systemDark = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

function resolve(pref: ThemePref): Phase {
  if (pref === "day" || pref === "night") return pref;
  if (pref === "system") return systemDark() ? "night" : "day";
  return currentPhase();
}

export function usePhase(pref: ThemePref, override: Phase | null): Phase {
  const [phase, setPhase] = useState<Phase>(() => resolve(pref));
  useEffect(() => {
    setPhase(resolve(pref));
    const t = setInterval(() => setPhase(resolve(pref)), 60_000);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => setPhase(resolve(pref));
    mq?.addEventListener?.("change", onChange);
    return () => {
      clearInterval(t);
      mq?.removeEventListener?.("change", onChange);
    };
  }, [pref]);
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
