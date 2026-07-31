/**
 * Bull market indicator panel — rewritten 2026-07-31.
 *
 * Previously this returned 30 hardcoded MOCK values pretending to be live.
 * Now it delegates to live-indicators.ts for the math (Pi Cycle, Mayer,
 * Puell proxy, Ahr999 proxy, 2yr MA, RSI-22, Rainbow position) and to
 * CoinGecko for live BTC dominance.
 *
 * Same exported shape so server/routes.ts doesn't need to change.
 */
import { getBullMarketIndicatorPanel, clearIndicatorsCache as clearLiveCache } from './live-indicators';

export interface BullMarketIndicator {
  id: number;
  name: string;
  current: string | number;
  reference: string;
  hitOrNot: boolean;
  distanceToHit: string | number;
  progress: string;
}

export interface CoinglassIndicatorsData {
  updateTime: string;
  totalHit: number;
  totalIndicators: number;
  overallSignal: 'Hold' | 'Sell';
  sellPercentage: number;
  indicators: BullMarketIndicator[];
}

// Re-export so existing imports still work.
export type { CoinglassIndicatorsData };

export async function getCoinglassIndicators(): Promise<CoinglassIndicatorsData> {
  const panel = await getBullMarketIndicatorPanel();
  return {
    updateTime: panel.asOf,
    totalHit: panel.totalHit,
    totalIndicators: panel.totalIndicators,
    overallSignal: panel.overallSignal,
    sellPercentage: panel.sellPercentage,
    indicators: panel.indicators,
  };
}

export function clearNetworkStatsCache(): void {
  clearLiveCache();
}
