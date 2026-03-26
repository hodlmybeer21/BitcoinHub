import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

// Hardcoded historical BTC monthly average prices (USD)
// Source: Historical market data averages
const BTC_MONTHLY_PRICES: Record<string, number> = {
  // 2012
  "2012-01": 6.0,
  "2012-02": 4.5,
  "2012-03": 4.9,
  "2012-04": 5.1,
  "2012-05": 5.3,
  "2012-06": 6.6,
  "2012-07": 8.4,
  "2012-08": 10.0,
  "2012-09": 12.4,
  "2012-10": 11.0,
  "2012-11": 12.5,
  "2012-12": 13.4,

  // 2013
  "2013-01": 20.0,
  "2013-02": 28.0,
  "2013-03": 92.0,
  "2013-04": 135.0,
  "2013-05": 128.0,
  "2013-06": 97.0,
  "2013-07": 98.0,
  "2013-08": 128.0,
  "2013-09": 140.0,
  "2013-10": 198.0,
  "2013-11": 1075.0,
  "2013-12": 755.0,

  // 2014
  "2014-01": 810.0,
  "2014-02": 620.0,
  "2014-03": 453.0,
  "2014-04": 450.0,
  "2014-05": 630.0,
  "2014-06": 640.0,
  "2014-07": 585.0,
  "2014-08": 480.0,
  "2014-09": 390.0,
  "2014-10": 340.0,
  "2014-11": 375.0,
  "2014-12": 320.0,

  // 2015
  "2015-01": 217.0,
  "2015-02": 254.0,
  "2015-03": 244.0,
  "2015-04": 236.0,
  "2015-05": 229.0,
  "2015-06": 262.0,
  "2015-07": 284.0,
  "2015-08": 230.0,
  "2015-09": 237.0,
  "2015-10": 314.0,
  "2015-11": 376.0,
  "2015-12": 430.0,

  // 2016
  "2016-01": 379.0,
  "2016-02": 437.0,
  "2016-03": 416.0,
  "2016-04": 448.0,
  "2016-05": 530.0,
  "2016-06": 672.0,
  "2016-07": 629.0,
  "2016-08": 572.0,
  "2016-09": 609.0,
  "2016-10": 697.0,
  "2016-11": 742.0,
  "2016-12": 963.0,

  // 2017
  "2017-01": 966.0,
  "2017-02": 1190.0,
  "2017-03": 1080.0,
  "2017-04": 1348.0,
  "2017-05": 2280.0,
  "2017-06": 2490.0,
  "2017-07": 2875.0,
  "2017-08": 4760.0,
  "2017-09": 4330.0,
  "2017-10": 6120.0,
  "2017-11": 10950.0,
  "2017-12": 14900.0,

  // 2018
  "2018-01": 10200.0,
  "2018-02": 10300.0,
  "2018-03": 6920.0,
  "2018-04": 9240.0,
  "2018-05": 7480.0,
  "2018-06": 5870.0,
  "2018-07": 6480.0,
  "2018-08": 7040.0,
  "2018-09": 6620.0,
  "2018-10": 6380.0,
  "2018-11": 4010.0,
  "2018-12": 3710.0,

  // 2019
  "2019-01": 3450.0,
  "2019-02": 3780.0,
  "2019-03": 4090.0,
  "2019-04": 5350.0,
  "2019-05": 8570.0,
  "2019-06": 10800.0,
  "2019-07": 10080.0,
  "2019-08": 10640.0,
  "2019-09": 8290.0,
  "2019-10": 9190.0,
  "2019-11": 7560.0,
  "2019-12": 7190.0,

  // 2020
  "2020-01": 9350.0,
  "2020-02": 9900.0,
  "2020-03": 6420.0,
  "2020-04": 8590.0,
  "2020-05": 9450.0,
  "2020-06": 9130.0,
  "2020-07": 11350.0,
  "2020-08": 11650.0,
  "2020-09": 10780.0,
  "2020-10": 13800.0,
  "2020-11": 19700.0,
  "2020-12": 29000.0,

  // 2021
  "2021-01": 33100.0,
  "2021-02": 45200.0,
  "2021-03": 58800.0,
  "2021-04": 57700.0,
  "2021-05": 37300.0,
  "2021-06": 35000.0,
  "2021-07": 41400.0,
  "2021-08": 47200.0,
  "2021-09": 43790.0,
  "2021-10": 61300.0,
  "2021-11": 57000.0,
  "2021-12": 46300.0,

  // 2022
  "2022-01": 38400.0,
  "2022-02": 43200.0,
  "2022-03": 45500.0,
  "2022-04": 37700.0,
  "2022-05": 31800.0,
  "2022-06": 19700.0,
  "2022-07": 23300.0,
  "2022-08": 20000.0,
  "2022-09": 19400.0,
  "2022-10": 20500.0,
  "2022-11": 17100.0,
  "2022-12": 16500.0,

  // 2023
  "2023-01": 23100.0,
  "2023-02": 23100.0,
  "2023-03": 28500.0,
  "2023-04": 29400.0,
  "2023-05": 27200.0,
  "2023-06": 30400.0,
  "2023-07": 29200.0,
  "2023-08": 26000.0,
  "2023-09": 27000.0,
  "2023-10": 34500.0,
  "2023-11": 37600.0,
  "2023-12": 42200.0,

  // 2024
  "2024-01": 42500.0,
  "2024-02": 51800.0,
  "2024-03": 69500.0,
  "2024-04": 63500.0,
  "2024-05": 67800.0,
  "2024-06": 60500.0,
  "2024-07": 64500.0,
  "2024-08": 70000.0,
  "2024-09": 64000.0,
  "2024-10": 73500.0,
  "2024-11": 98000.0,
  "2024-12": 96000.0,

  // 2025 (partial - through March)
  "2025-01": 104000.0,
  "2025-02": 95000.0,
  "2025-03": 87000.0,
};

// Get current BTC price (using latest available data point)
function getCurrentBTCPrice(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Try to find current month first
  const currentKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  if (BTC_MONTHLY_PRICES[currentKey]) {
    return BTC_MONTHLY_PRICES[currentKey];
  }
  
  // Otherwise use most recent data
  const sortedKeys = Object.keys(BTC_MONTHLY_PRICES).sort();
  const lastKey = sortedKeys[sortedKeys.length - 1];
  return BTC_MONTHLY_PRICES[lastKey];
}

interface DCAResult {
  totalInvested: number;
  btcAccumulated: number;
  currentValue: number;
  totalReturn: number;
  returnPercent: number;
  satsAccumulated: number;
  priceAtStart: number;
  priceNow: number;
  monthsInvested: number;
  dataPoints: Array<{
    date: string;
    btcHeld: number;
    usdValue: number;
  }>;
}

export async function calculateDCA(
  monthlyAmount: number,
  startYear: number
): Promise<DCAResult> {
  const currentBTCPrice = getCurrentBTCPrice();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let totalInvested = 0;
  let btcAccumulated = 0;
  const dataPoints: Array<{ date: string; btcHeld: number; usdValue: number }> = [];
  let priceAtStart = 0;
  let monthsInvested = 0;

  // Iterate through each month from start year to now
  for (let year = startYear; year <= currentYear; year++) {
    const startMonth = year === startYear ? 1 : 1;
    const endMonth = year === currentYear ? currentMonth : 12;

    for (let month = startMonth; month <= endMonth; month++) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const price = BTC_MONTHLY_PRICES[monthKey];

      if (price) {
        if (year === startYear && month === startMonth) {
          priceAtStart = price;
        }

        const btcBought = monthlyAmount / price;
        btcAccumulated += btcBought;
        totalInvested += monthlyAmount;
        monthsInvested++;

        dataPoints.push({
          date: monthKey,
          btcHeld: parseFloat(btcAccumulated.toFixed(8)),
          usdValue: parseFloat((btcAccumulated * currentBTCPrice).toFixed(2)),
        });
      }
    }
  }

  const currentValue = btcAccumulated * currentBTCPrice;
  const totalReturn = currentValue - totalInvested;
  const returnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  const satsAccumulated = Math.floor(btcAccumulated * 100000000);

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    btcAccumulated: parseFloat(btcAccumulated.toFixed(8)),
    currentValue: Math.round(currentValue * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    satsAccumulated,
    priceAtStart: Math.round(priceAtStart * 100) / 100,
    priceNow: Math.round(currentBTCPrice * 100) / 100,
    monthsInvested,
    dataPoints,
  };
}

// GET /api/dca-simulator
router.get("/dca-simulator", async (req: Request, res: Response) => {
  try {
    const monthly = parseInt(req.query.monthly as string) || 50;
    const startYear = parseInt(req.query.startYear as string) || 2020;

    // Validate inputs
    if (monthly < 10 || monthly > 1000) {
      return res.status(400).json({ 
        error: "Monthly amount must be between $10 and $1000" 
      });
    }

    if (startYear < 2012 || startYear > 2025) {
      return res.status(400).json({ 
        error: "Start year must be between 2012 and 2025" 
      });
    }

    const result = await calculateDCA(monthly, startYear);

    return res.json(result);
  } catch (error) {
    console.error("DCA simulator error:", error);
    return res.status(500).json({ 
      error: "Failed to calculate DCA results" 
    });
  }
});

export default router;
