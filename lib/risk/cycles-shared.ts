// BitcoinHub Risk Metric — cycles-shared.ts
// Halving dates shared between server (cycles handler) and timeseries
// (overlay markers). Kept in its own file to avoid a circular dep
// (cycles.ts imports from Vercel types which timeseries doesn't need).

export interface Halving {
  date: string;          // ISO date
  blockHeight: number;
  cycleIndex: number;    // 1-based
}

export const HALVINGS: Halving[] = [
  { date: '2012-11-28', blockHeight: 210000, cycleIndex: 1 },
  { date: '2016-07-09', blockHeight: 420000, cycleIndex: 2 },
  { date: '2020-05-11', blockHeight: 630000, cycleIndex: 3 },
  { date: '2024-04-20', blockHeight: 840000, cycleIndex: 4 },
];
