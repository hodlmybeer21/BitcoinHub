// Date-aware FRED math shared by the API (lib/macro/fred-csv.ts) and the client tiles. Audit D2/D3/D4: the old code indexed rows by position on a CSV that
// starts at the series' first observation (1959 for M2SL), so "YoY" compared 1959 months.

export interface FredPoint { date: string; value: number }

/** Parse fredgraph.csv text ("observation_date,SERIES" header). Missing values (".") are dropped. */
export function parseFredCsv(text: string): FredPoint[] {
  const out: FredPoint[] = [];
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [date, raw] = line.split(',');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) continue;
    const v = Number(raw);
    if (raw === '.' || raw === '' || !Number.isFinite(v)) continue;
    out.push({ date, value: v });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Last point dated on or before `iso`. */
export function onOrBefore(points: FredPoint[], iso: string): FredPoint | null {
  let hit: FredPoint | null = null;
  for (const p of points) { if (p.date <= iso) hit = p; else break; }
  return hit;
}

const shiftMonths = (iso: string, months: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
const shiftDays = (iso: string, days: number) =>
  new Date(new Date(iso + 'T00:00:00Z').getTime() + days * 86400000).toISOString().slice(0, 10);

/** % change of the latest point vs the same month a year earlier (monthly series). */
export function yoyPct(points: FredPoint[], at?: FredPoint): number | null {
  const last = at ?? points[points.length - 1];
  if (!last) return null;
  const prev = points.find(p => p.date === shiftMonths(last.date, -12));
  if (!prev || prev.value === 0) return null;
  return ((last.value - prev.value) / prev.value) * 100;
}

/** Month-over-month % change of the latest point (monthly series). */
export function momPct(points: FredPoint[]): number | null {
  const last = points[points.length - 1];
  if (!last) return null;
  const prev = points.find(p => p.date === shiftMonths(last.date, -1));
  if (!prev || prev.value === 0) return null;
  return ((last.value - prev.value) / prev.value) * 100;
}

/** Change in basis points between the latest point and the last point on/before `days` calendar days earlier (daily % series). */
export function bpChange(points: FredPoint[], days: number): number | null {
  const last = points[points.length - 1];
  if (!last) return null;
  const base = onOrBefore(points, shiftDays(last.date, -days));
  if (!base) return null;
  return Math.round((last.value - base.value) * 100);
}

export const monthsAgoISO = (months: number, now = new Date()) => shiftMonths(now.toISOString().slice(0, 10), -months);
export const daysAgoISO = (days: number, now = new Date()) => shiftDays(now.toISOString().slice(0, 10), -days);
