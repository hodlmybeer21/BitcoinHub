// Deribit public API v2 options summary (audit B6). v6 does not exist and returned HTML,
// so the old handler always served hardcoded "proxy" numbers.
// v2 fields: instrument_name "BTC-27NOV26-73000-P", open_interest (in coins),
// volume (coins), volume_usd, mark_iv (percent), mark_price (in coins), underlying_price (USD).

export const DERIBIT_V2_BOOK = (currency: 'BTC' | 'ETH') =>
  `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`;

export interface DeribitSummary {
  instrument_name: string;
  open_interest?: number;
  volume?: number;
  volume_usd?: number;
  mark_iv?: number;
  mark_price?: number;
  underlying_price?: number;
}

export interface ParsedOption { expiry: string; strike: number; type: 'call' | 'put'; oiUsd: number; volUsd: number; iv: number; markUsd: number }

export function parseInstrument(name: string): { expiry: string; strike: number; type: 'call' | 'put' } | null {
  const m = /^[A-Z]+-(\d{1,2}[A-Z]{3}\d{2})-(\d+(?:d\d+)?)-([CP])$/.exec(name);
  if (!m) return null;
  return { expiry: m[1], strike: Number(m[2].replace('d', '.')), type: m[3] === 'C' ? 'call' : 'put' };
}

export function parseOptions(rows: DeribitSummary[]): ParsedOption[] {
  const out: ParsedOption[] = [];
  for (const r of rows) {
    const p = parseInstrument(r.instrument_name ?? '');
    const px = Number(r.underlying_price);
    if (!p || !(px > 0)) continue;
    out.push({
      ...p,
      oiUsd: (r.open_interest ?? 0) * px,
      volUsd: r.volume_usd ?? (r.volume ?? 0) * px,
      iv: (r.mark_iv ?? 0) / 100,
      markUsd: (r.mark_price ?? 0) * px,
    });
  }
  return out;
}

/** Aggregate in USD notional. netDelta is a call-minus-put OI proxy (Deribit's summary has no greeks). */
export function aggregate(opts: ParsedOption[]) {
  let putOI = 0, callOI = 0, putVol = 0, callVol = 0;
  for (const o of opts) {
    if (o.type === 'put') { putOI += o.oiUsd; putVol += o.volUsd; } else { callOI += o.oiUsd; callVol += o.volUsd; }
  }
  return {
    putCallRatio: callOI > 0 ? putOI / callOI : 0,
    totalOI: putOI + callOI,
    totalVolume: putVol + callVol,
    putCallVolumeRatio: callVol > 0 ? putVol / callVol : 0,
    netDelta: callOI - putOI,
    sentiment: callOI > putOI ? 'bullish' : callOI < putOI ? 'bearish' : 'neutral',
  };
}

/** Top strikes by USD open interest, summed across expiries per (strike, type). */
export function topStrikes(opts: ParsedOption[], n = 10) {
  const by = new Map<string, { strike: number; type: 'call' | 'put'; oi: number; vol: number; ivW: number; markW: number }>();
  for (const o of opts) {
    const k = `${o.strike}-${o.type}`;
    const e = by.get(k) ?? { strike: o.strike, type: o.type, oi: 0, vol: 0, ivW: 0, markW: 0 };
    e.oi += o.oiUsd; e.vol += o.volUsd; e.ivW += o.iv * o.oiUsd; e.markW += o.markUsd * o.oiUsd;
    by.set(k, e);
  }
  return [...by.values()]
    .sort((a, b) => b.oi - a.oi)
    .slice(0, n)
    .map(e => ({
      symbol: 'BTC (all expiries)',
      strike: e.strike,
      type: e.type,
      openInterest: Math.round(e.oi),
      volume: Math.round(e.vol),
      iv: e.oi > 0 ? e.ivW / e.oi : 0,
      markPrice: e.oi > 0 ? Math.round(e.markW / e.oi) : 0,
    }));
}
