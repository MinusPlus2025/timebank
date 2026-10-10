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
