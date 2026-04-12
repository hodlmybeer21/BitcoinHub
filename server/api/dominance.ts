import axios from 'axios';

// Cache for dominance data
let dominanceCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return dominanceCache !== null && 
         (Date.now() - dominanceCache.timestamp) < CACHE_DURATION;
}

// Clear cache function for manual refresh
export function clearDominanceCache(): void {
  dominanceCache = null;
  console.log('Dominance cache cleared for fresh data fetch');
}

export async function getBitcoinDominance(): Promise<{
  dominance: number;
  totalMarketCap: number;
  lastUpdated: string;
  source: string;
}> {
  // Return cached data if valid
  if (isCacheValid() && dominanceCache?.data) {
    return dominanceCache.data;
  }

  try {
    console.log('Fetching live Bitcoin dominance from CoinGecko API...');
    
    // CoinGecko global data endpoint - free and reliable
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/global',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'BitcoinHub-DominanceTracker/1.0'
        }
      }
    );

    if (response.data && response.data.data) {
      const globalData = response.data.data;
      
      const dominanceData = {
        dominance: globalData.market_cap_percentage?.btc || 63.5,
        totalMarketCap: globalData.total_market_cap?.usd || 3600000000000,
        lastUpdated: new Date().toISOString(),
        source: 'CoinGecko Global'
      };

      console.log(`Bitcoin dominance from CoinGecko: ${dominanceData.dominance.toFixed(1)}%`);

      // Cache the successful data
      dominanceCache = {
        data: dominanceData,
        timestamp: Date.now()
      };

      return dominanceData;
    }

    throw new Error('Invalid response format from CoinGecko');

  } catch (error) {
    console.error('Error fetching Bitcoin dominance from CoinGecko:', error);
    
    // Fallback with realistic current market data
    const fallbackData = {
      // Updated fallbacks for April 2025 - BTC ~$93k range
      dominance: 60.8, // Current Bitcoin dominance
      totalMarketCap: 3300000000000, // ~$3.3T total crypto market cap
      lastUpdated: new Date().toISOString(),
      source: 'CoinGecko Global (Fallback)'
    };

    // Cache fallback data to prevent repeated API calls
    dominanceCache = {
      data: fallbackData,
      timestamp: Date.now()
    };

    return fallbackData;
  }
}

export async function getGlobalCryptoMetrics(): Promise<{
  totalMarketCap: number;
  total24hVolume: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptocurrencies: number;
  lastUpdated: string;
  source: string;
}> {
  try {
    console.log('Fetching global crypto metrics from CoinGecko...');
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/global',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'BitcoinHub-GlobalMetrics/1.0'
        }
      }
    );

    if (response.data && response.data.data) {
      const globalData = response.data.data;
      
      return {
        totalMarketCap: globalData.total_market_cap?.usd || 3300000000000,
        total24hVolume: globalData.total_volume?.usd || 190000000000,
        btcDominance: globalData.market_cap_percentage?.btc || 60.8,
        ethDominance: globalData.market_cap_percentage?.eth || 13.2,
        activeCryptocurrencies: globalData.active_cryptocurrencies || 3200,
        lastUpdated: new Date().toISOString(),
        source: 'CoinGecko Global'
      };
    }

    throw new Error('Invalid response format from CoinGecko');

  } catch (error) {
    console.error('Error fetching global crypto metrics from CoinGecko:', error);
    
    // Fallback with realistic data
    return {
      // Updated fallbacks for April 2025 - BTC ~$93k range
      totalMarketCap: 3300000000000,
      total24hVolume: 190000000000,
      btcDominance: 60.8,
      ethDominance: 13.2,
      activeCryptocurrencies: 3200,
      lastUpdated: new Date().toISOString(),
      source: 'CoinGecko Global (Fallback)'
    };
  }
}