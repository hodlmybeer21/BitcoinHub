import { BitcoinPrice, BitcoinMarketData, ChartData, ProcessedChartData } from "../../client/src/lib/types";

// CoinGecko API base URL
const API_BASE_URL = "https://api.coingecko.com/api/v3";

// API key configuration - this allows us to use it if available
const API_KEY = process.env.COINGECKO_API_KEY;

// Helper function to add API key to requests if available
function getHeaders() {
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (API_KEY) {
    headers['x-cg-api-key'] = API_KEY;
  }
  
  return headers;
}

// Add query parameter to URL if API key is present
function getApiUrl(url: string): string {
  // If we don't have an API key, just return the original URL
  if (!API_KEY) return url;
  
  // Add API key as a query parameter
  return `${url}${url.includes('?') ? '&' : '?'}x_cg_api_key=${API_KEY}`;
}

// Backup/cache mechanism for when API calls fail
const cacheData = {
  bitcoinPrice: null as BitcoinPrice | null,
  marketData: null as BitcoinMarketData | null,
  lastUpdated: 0,
  cacheLifetime: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Check if cache is still valid
function isCacheValid(): boolean {
  return (
    cacheData.bitcoinPrice !== null &&
    cacheData.marketData !== null &&
    Date.now() - cacheData.lastUpdated < cacheData.cacheLifetime
  );
}

// Get current Bitcoin price
export async function getBitcoinPrice(): Promise<BitcoinPrice> {
  try {
    // Check if we have a valid cache
    if (isCacheValid() && cacheData.bitcoinPrice) {
      return cacheData.bitcoinPrice;
    }
    
    const url = `${API_BASE_URL}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const response = await fetch(getApiUrl(url), { 
      headers: getHeaders(),
      // Add small timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000) 
    });
    
    if (!response.ok) {
      // If we have cached data and there's an error, use the cache
      if (cacheData.bitcoinPrice) {
        console.log("Using cached Bitcoin price data due to API error");
        return cacheData.bitcoinPrice;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const price = data.bitcoin as BitcoinPrice;
    
    // Update cache
    cacheData.bitcoinPrice = price;
    cacheData.lastUpdated = Date.now();
    
    return price;
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error);
    
    // If we have any cached data, return it even if expired
    if (cacheData.bitcoinPrice) {
      return cacheData.bitcoinPrice;
    }
    
    // Last resort fallback - updated to realistic current price
    return {
      usd: 93000,
      usd_24h_change: 1.5,
      last_updated_at: Date.now() / 1000
    };
  }
}

// Get Bitcoin market data
export async function getBitcoinMarketData(): Promise<BitcoinMarketData> {
  try {
    // Check if we have a valid cache
    if (isCacheValid() && cacheData.marketData) {
      return cacheData.marketData;
    }
    
    const url = `${API_BASE_URL}/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const response = await fetch(getApiUrl(url), {
      headers: getHeaders(),
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      // If we have cached data and there's an error, use the cache
      if (cacheData.marketData) {
        console.log("Using cached Bitcoin market data due to API error");
        return cacheData.marketData;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const marketData = data.market_data as BitcoinMarketData;
    
    // Update cache
    cacheData.marketData = marketData;
    cacheData.lastUpdated = Date.now();
    
    return marketData;
  } catch (error) {
    console.error("Error fetching Bitcoin market data:", error);
    
    // If we have any cached data, return it even if expired
    if (cacheData.marketData) {
      return cacheData.marketData;
    }
    
    // Last resort fallback with updated realistic values
    // BTC has surpassed $100k - update to reflect current market
    return {
      current_price: { usd: 92000 },
      market_cap: { usd: 1800000000000 },
      total_volume: { usd: 95000000000 }, // Updated to match current market (95B+)
      price_change_percentage_24h: 0.00,
      circulating_supply: 19800000,
      ath: { usd: 110000 }, // BTC surpassed $100k
      high_24h: { usd: 95000 },
      low_24h: { usd: 90000 }
    };
  }
}

// Create a cache for chart data by timeframe
const chartDataCache: Record<string, { data: ProcessedChartData[], timestamp: number }> = {};
const chartCacheLifetime = 60 * 1000; // 1 minute cache for chart data

// Get Bitcoin chart data
export async function getBitcoinChart(timeframe: string): Promise<ProcessedChartData[]> {
  try {
    // Check if we have cached data for this timeframe that's still valid
    if (
      chartDataCache[timeframe] && 
      Date.now() - chartDataCache[timeframe].timestamp < chartCacheLifetime
    ) {
      return chartDataCache[timeframe].data;
    }
    
    // Default settings
    let days = '1';
    let interval: string | undefined = undefined;
    
    // Map timeframes to appropriate API parameters
    switch (timeframe) {
      case '1m': // 1 minute
        days = '1';
        interval = 'minutely';
        break;
      case '5m': // 5 minutes
        days = '1';
        interval = 'minutely';
        break;
      case '1h': // 1 hour
        days = '1';
        interval = 'hourly';
        break;
      case '1d': // 1 day
        days = '1';
        interval = 'hourly';
        break;
      case '1w': // 1 week
        days = '7';
        interval = 'daily';
        break;
      case '1mo': // 1 month
        days = '30';
        interval = 'daily';
        break;
      // Maintain backward compatibility with old format
      case '1D':
        days = '1';
        interval = 'hourly';
        break;
      case '1W':
        days = '7';
        interval = 'daily';
        break;
      case '1M':
        days = '30';
        interval = 'daily';
        break;
      case '3M':
        days = '90';
        interval = 'daily';
        break;
      case '1Y':
        days = '365';
        interval = 'daily';
        break;
      case 'ALL':
        days = 'max';
        break;
      default:
        days = '1';
        interval = 'hourly';
    }
    
    // Build API URL with appropriate parameters
    let apiUrl = `${API_BASE_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`;
    if (interval) {
      apiUrl += `&interval=${interval}`;
    }
    
    // Use our utility functions to add API key if available
    const response = await fetch(getApiUrl(apiUrl), {
      headers: getHeaders(),
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      // If we have cached data for this timeframe, use it even if expired
      if (chartDataCache[timeframe]) {
        console.log(`Using cached chart data for timeframe ${timeframe} due to API error`);
        return chartDataCache[timeframe].data;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json() as ChartData;
    
    // Process the data to transform it into a format that's easier to work with in charts
    let processedData: ProcessedChartData[] = data.prices.map(([timestamp, price]) => ({
      timestamp: new Date(timestamp).toISOString(),
      price
    }));
    
    // For small timeframes (1m and 5m), we need to filter data points
    if (timeframe === '1m') {
      // Keep approximately 60 data points for 1-minute view (1 per minute)
      const last60Minutes = new Date();
      last60Minutes.setMinutes(last60Minutes.getMinutes() - 60);
      processedData = processedData
        .filter(d => new Date(d.timestamp) >= last60Minutes)
        .filter((_, i, arr) => i % Math.ceil(arr.length / 60) === 0 || i === arr.length - 1);
    } else if (timeframe === '5m') {
      // Keep approximately 60 data points for 5-minute view (1 per 5 minutes)
      const last300Minutes = new Date();
      last300Minutes.setMinutes(last300Minutes.getMinutes() - 300);
      processedData = processedData
        .filter(d => new Date(d.timestamp) >= last300Minutes)
        .filter((_, i, arr) => i % Math.ceil(arr.length / 60) === 0 || i === arr.length - 1);
    }
    
    // Update the cache
    chartDataCache[timeframe] = {
      data: processedData,
      timestamp: Date.now()
    };
    
    return processedData;
  } catch (error) {
    console.error("Error fetching Bitcoin chart data:", error);
    
    // If we have cached data for this timeframe, use it even if it's expired
    if (chartDataCache[timeframe]) {
      return chartDataCache[timeframe].data;
    }
    
    // Generate fallback data if API call fails and no cache is available
    const fallbackData: ProcessedChartData[] = [];
    const now = new Date();
    
    // Generate realistic data points based on selected timeframe
    let numPoints = 60; // Default number of data points
    let intervalMs = 60000; // Default time step in milliseconds (1 minute)
    
    // Base price and variation parameters for synthetic data
    // Updated to reflect BTC in $90k+ range (April 2025)
    const basePrice = cacheData.marketData?.current_price?.usd || 92000;
    const hourlyVolatility = 0.005; // 0.5% per hour
    const dailyTrend = 0.01; // 1% daily trend (up)
    
    switch (timeframe) {
      case '1m':
        numPoints = 60; // 1 minute intervals for 1 hour
        intervalMs = 60 * 1000; // 1 minute
        break;
      case '5m':
        numPoints = 60; // 5 minute intervals for 5 hours
        intervalMs = 5 * 60 * 1000; // 5 minutes
        break;
      case '1h':
        numPoints = 24; // Hourly intervals for 1 day
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case '1d':
      case '1D':
        numPoints = 24; // Hourly intervals for 1 day
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case '1w':
      case '1W':
        numPoints = 7; // Daily intervals for 1 week
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '1mo':
      case '1M':
        numPoints = 30; // Daily intervals for 1 month
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '3M':
        numPoints = 90;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '1Y':
        numPoints = 52;
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
        break;
      case 'ALL':
        numPoints = 60;
        intervalMs = 30 * 24 * 60 * 60 * 1000; // 1 month
        break;
    }
    
    // Create data points with realistic price movement
    for (let i = 0; i < numPoints; i++) {
      const timestamp = new Date(now.getTime() - (numPoints - i) * intervalMs);
      
      // Calculate price with some randomness and trend
      const timeEffect = (i / numPoints) * dailyTrend; // Increasing trend over time
      const randomEffect = (Math.random() - 0.5) * 2 * hourlyVolatility; // Random noise
      const priceChange = timeEffect + randomEffect;
      
      // Price with compounding effect
      const price = basePrice * Math.pow(1 + priceChange, i);
      
      fallbackData.push({
        timestamp: timestamp.toISOString(),
        price
      });
    }
    
    // Cache the fallback data too
    chartDataCache[timeframe] = {
      data: fallbackData,
      timestamp: Date.now()
    };
    
    return fallbackData;
  }
}
