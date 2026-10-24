// Q4-2026 bottom-window status for /cycle (audit D6). The window is Aug 1 – Oct 31, 2026
// (WINDOW_OPEN_ISO in api/index.ts; "Aug–Oct" on the page). Pure so it's testable.
export const WINDOW_CLOSE_ISO = "2026-11-01T00:00:00Z"; // exclusive: window covers Aug–Oct

export type WindowStatus =
  | { phase: "before"; weeks: number }
  | { phase: "open"; weeksSinceOpen: number }
  | { phase: "closed" };

export function windowStatus(windowOpenISO: string, now: Date = new Date()): WindowStatus {
  const open = new Date(windowOpenISO).getTime();
  const close = new Date(WINDOW_CLOSE_ISO).getTime();
  const t = now.getTime();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  if (t < open) return { phase: "before", weeks: Math.max(0, Math.ceil((open - t) / WEEK)) };
  if (t < close) return { phase: "open", weeksSinceOpen: Math.floor((t - open) / WEEK) };
  return { phase: "closed" };
}

/** Short phrase used in the hero, the live strip and the milestone row. */
export function windowPhrase(s: WindowStatus): string {
  if (s.phase === "before") return `${s.weeks} week${s.weeks === 1 ? "" : "s"} away`;
  if (s.phase === "open") return `open now: it opened Aug 1, 2026 (${s.weeksSinceOpen} weeks ago) and runs through Oct 2026`;
  return "closed: it ran Aug 1 – Oct 31, 2026";
}
