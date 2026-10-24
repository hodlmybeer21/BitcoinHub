// Pure helpers for /api/cycle/state (audit B5). No I/O, so they're unit-testable.

export interface DailyPoint { date: string; price: number } // date = YYYY-MM-DD (UTC)

/**
 * Weekly closes from a daily series: the last daily close of each week, weeks
 * ending Sunday (UTC), matching the usual exchange weekly candle.
 * The current, still-open week is dropped so the MA only uses completed weeks.
 */
export function weeklyCloses(daily: DailyPoint[], now: Date = new Date()): number[] {
  const byWeek = new Map<string, number>();
  const weekKey = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z');
    const dow = d.getUTCDay(); // 0 = Sun
    const end = new Date(d.getTime() + ((7 - dow) % 7) * 86400000); // week-ending Sunday
    return end.toISOString().slice(0, 10);
  };
  const sorted = [...daily].filter(p => Number.isFinite(p.price) && p.price > 0).sort((a, b) => a.date.localeCompare(b.date));
  for (const p of sorted) byWeek.set(weekKey(p.date), p.price);
  const currentWeek = weekKey(now.toISOString().slice(0, 10));
  return [...byWeek.entries()]
    .filter(([wk]) => wk < currentWeek || (wk === currentWeek && now.getUTCDay() === 0 && now.getUTCHours() >= 23))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, px]) => px);
}

/** Simple moving average of the last `n` values, or null if there aren't enough. */
export function sma(values: number[], n: number): number | null {
  if (values.length < n) return null;
  const tail = values.slice(-n);
  return tail.reduce((s, v) => s + v, 0) / n;
}

/** % change between the latest close and the close `days` days earlier (calendar), or null. */
export function changeOverDays(daily: DailyPoint[], days: number): number | null {
  if (daily.length < 2) return null;
  const last = daily[daily.length - 1];
  const target = new Date(new Date(last.date + 'T00:00:00Z').getTime() - days * 86400000).toISOString().slice(0, 10);
  let base: DailyPoint | undefined;
  for (const p of daily) { if (p.date <= target) base = p; else break; }
  if (!base || base.price <= 0) return null;
  return ((last.price - base.price) / base.price) * 100;
}
