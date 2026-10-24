// Fear & Greed summary from alternative.me rows (newest first). Pure, unit-tested.
// Replaces a random "lastWeek" and hardcoded 2024/2025 yearly high/low (audit D8 follow-up).
export interface FngRow { value: string | number; timestamp: string | number; value_classification?: string }

export function classifyFng(v: number): string {
  if (v <= 24) return 'Extreme Fear';
  if (v <= 49) return 'Fear';
  if (v <= 54) return 'Neutral';
  if (v <= 74) return 'Greed';
  return 'Extreme Greed';
}

export function summarizeFng(rows: FngRow[]) {
  const pts = rows
    .map(r => ({ value: Number(r.value), date: new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10) }))
    .filter(p => Number.isFinite(p.value));
  if (!pts.length) throw new Error('no Fear & Greed data');
  const year = pts.slice(0, 365);
  const hi = year.reduce((a, b) => (b.value > a.value ? b : a));
  const lo = year.reduce((a, b) => (b.value < a.value ? b : a));
  return {
    currentValue: pts[0].value,
    classification: classifyFng(pts[0].value),
    yesterday: pts[1]?.value ?? null,
    lastWeek: pts[7]?.value ?? null,
    yearlyHigh: { value: hi.value, date: hi.date },
    yearlyLow: { value: lo.value, date: lo.date },
    asOf: pts[0].date,
    daysInWindow: year.length,
  };
}
