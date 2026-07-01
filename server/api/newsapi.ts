import { NewsItem } from "../../client/src/lib/types";
import axios from 'axios';

// Default categories for Bitcoin news.
// Names mirror the News Hub tabs (case-insensitive filter on the page) so that
// any RSS item without a more specific match still lights up one of the tabs.
const DEFAULT_CATEGORIES = ["News", "Mining", "ETF", "Markets", "Security", "Wallets", "Bitcoin"];

// RSS feed sources
const RSS_FEEDS = [
  { url: 'https://news.bitcoin.com/feed/', source: 'Bitcoin.com', categories: ['News'] },
  { url: 'https://cryptonews.com/feed/', source: 'CryptoNews', categories: ['News', 'Markets'] },
];

// Cache mechanism to avoid hitting rate limits
let newsCache: {
  timestamp: number;
  data: NewsItem[];
} | null = null;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Check if cache is valid
function isCacheValid(): boolean {
  return !!(newsCache && Date.now() - newsCache.timestamp < CACHE_DURATION);
}

// Extract categories from news item content.
// Tags mirror the News Hub tabs. "Bitcoin" is added whenever the article is
// bitcoin-specific so the Bitcoin tab isn't empty.
function extractCategories(title: string, body: string): string[] {
  const content = (title + " " + body).toLowerCase();
  const categories: string[] = [];

  // Domain-specific tags first; these align to News Hub tab labels exactly.
  if (content.includes("bitcoin") || content.includes("btc")) categories.push("Bitcoin");
  if (content.includes("mining") || content.includes("miner") || content.includes("hashrate")) categories.push("Mining");
  if (content.includes("etf") || content.includes("exchange traded") || content.includes("spot etf")) categories.push("ETF");
  if (content.includes("market") || content.includes("price") || content.includes("rally") || content.includes("crash") || content.includes("trading")) categories.push("Price", "Markets");
  if (content.includes("security") || content.includes("hack") || content.includes("phishing") || content.includes("exploit") || content.includes("breach")) categories.push("Security");
  if (content.includes("wallet") || content.includes("storage") || content.includes("cold storage")) categories.push("Wallets");
  if (content.includes("regulation") || content.includes("sec ") || content.includes("cftc") || content.includes("bill") || content.includes("law") || content.includes("senate") || content.includes("congress")) categories.push("Regulation");
  if (content.includes("whale") || content.includes("large transaction")) categories.push("Whale");
  if (content.includes("institutional") || content.includes("blackrock") || content.includes("fidelity") || content.includes("microstrategy") || content.includes("mstr")) categories.push("Institutional");
  if (content.includes("adoption") || content.includes(" accept") || content.includes(" legal tender") || content.includes("country")) categories.push("Adoption");

  // De-dupe while preserving order
  const seen = new Set<string>();
  const dedup = categories.filter(c => (seen.has(c) ? false : (seen.add(c), true)));

  // If no specific category was found, mark as general news + Bitcoin
  if (dedup.length === 0) {
    dedup.push("News", "Bitcoin");
  } else if (!seen.has("Bitcoin")) {
    // Every Bitcoin-news item should at least also belong to the Bitcoin tab
    dedup.unshift("Bitcoin");
  }

  return dedup;
}

// Strip HTML tags from text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Fetch news from a single RSS feed via rss2json
async function fetchFromFeed(feed: { url: string; source: string; categories: string[] }): Promise<NewsItem[]> {
  try {
    const response = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, {
      timeout: 10000,
    });

    if (response.data?.status === 'ok' && response.data?.items) {
      return response.data.items.map((item: any, index: number) => {
        const description = stripHtml(item.description || '').substring(0, 200);
        const categories = item.categories && item.categories.length > 0 
          ? item.categories.map((c: string) => c.charAt(0).toUpperCase() + c.slice(1))
          : feed.categories;

        return {
          id: item.guid || `feed-${feed.source}-${index}`,
          title: stripHtml(item.title),
          description: description + (description.length >= 200 ? '...' : ''),
          url: item.link,
          source: feed.source,
          publishedAt: item.pubDate || new Date().toISOString(),
          categories: extractCategories(item.title, description),
          imageUrl: item.thumbnail || item.enclosure?.link || 'https://images.unsplash.com/photo-1621504450181-5d356f61d307?ixlib=rb-4.0.3',
        };
      });
    }
  } catch (error) {
    console.warn(`Failed to fetch from ${feed.source}:`, error);
  }
  return [];
}

// Get latest Bitcoin news using RSS feeds
export async function getLatestNews(category?: string): Promise<NewsItem[]> {
  try {
    // Use cached data if available and valid
    if (isCacheValid()) {
      let items = newsCache!.data;
      
      // Filter by category if provided
      if (category) {
        items = items.filter(item => item.categories.includes(category));
      }
      
      return items;
    }
    
    // Fetch from all RSS feeds in parallel
    const allNews = await Promise.all(RSS_FEEDS.map(feed => fetchFromFeed(feed)));
    
    // Flatten and sort by date (newest first)
    let items: NewsItem[] = allNews
      .flat()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Deduplicate by URL
    const seenUrls = new Set<string>();
    items = items.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });
    
    // Update cache
    newsCache = {
      timestamp: Date.now(),
      data: items,
    };
    
    // Filter by category if provided
    if (category) {
      items = items.filter(item => item.categories.includes(category));
    }
    
    return items;
  } catch (error) {
    console.error("Error fetching news:", error);
    
    // If cache exists but is expired, still use it as fallback during errors
    if (newsCache) {
      console.log("Using expired cache as fallback due to API error");
      let items = newsCache.data;
      
      if (category) {
        items = items.filter(item => item.categories.includes(category));
      }
      
      return items;
    }
    
    // Return empty array if there was an error and no cache
    return [];
  }
}
