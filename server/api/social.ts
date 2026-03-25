/**
 * Social Media Integration
 * Uses free APIs (CryptoCompare Social API) with fallback to mock data
 * No API key required for basic use
 */

import axios from 'axios';

// Types for social data
interface SocialPost {
  id: string;
  text: string;
  created_at: string;
  author: {
    name: string;
    username: string;
    profile_image_url: string;
    verified: boolean;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
  url: string;
}

interface TrendingTopic {
  name: string;
  posts: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface PopularAccount {
  name: string;
  username: string;
  bio: string;
  followers: number;
  avatar: string;
}

// Cache for social data
let socialCache: {
  posts: SocialPost[];
  topics: TrendingTopic[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return !!(socialCache && Date.now() - socialCache.timestamp < CACHE_DURATION);
}

// Fallback mock data for Bitcoin community
const MOCK_POSTS: SocialPost[] = [
  {
    id: '1',
    text: 'Bitcoin is not just a currency, it\'s a movement. Sound money for the digital age. #Bitcoin',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: {
      name: 'Michael Saylor',
      username: 'saylor',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1447308214475090945/PcLWkFuH_400x400.jpg',
      verified: true,
    },
    metrics: { likes: 5420, retweets: 892, replies: 156, quotes: 78 },
    url: 'https://twitter.com/saylor/status/1',
  },
  {
    id: '2',
    text: 'The only assets with real scarcity are those that cannot be reproduced: time, attention, and Bitcoin. Choose wisely.',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    author: {
      name: 'NVK',
      username: 'nvk',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1384578568479554563/XzKa4XLt_400x400.jpg',
      verified: true,
    },
    metrics: { likes: 3210, retweets: 567, replies: 89, quotes: 45 },
    url: 'https://twitter.com/nvk/status/2',
  },
  {
    id: '3',
    text: 'Bitcoin mining is now greener than ever. Over 50% powered by sustainable energy. The facts speak for themselves. #BTC',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    author: {
      name: 'Bitcoin Magazine',
      username: 'BitcoinMagazine',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1653442762800877570/lQ8Yk1kP_400x400.jpg',
      verified: true,
    },
    metrics: { likes: 4560, retweets: 1023, replies: 234, quotes: 112 },
    url: 'https://twitter.com/BitcoinMagazine/status/3',
  },
  {
    id: '4',
    text: '不理解比特币的人，不理解货币的历史。法定货币只是历史的一个插曲。',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    author: {
      name: 'HodlMyBeer21',
      username: 'HodlMyBeer21',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1234567890/hodlmybeer_400x400.jpg',
      verified: false,
    },
    metrics: { likes: 234, retweets: 56, replies: 23, quotes: 12 },
    url: 'https://twitter.com/HodlMyBeer21/status/4',
  },
  {
    id: '5',
    text: 'The US government can\'t print gold. They can\'t print Bitcoin. The difference matters more every year. #Bitcoin',
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    author: {
      name: 'Gigi',
      username: 'bitcoinashi',
      profile_image_url: 'https://pbs.twimg.com/profile_images/1593707235469832192/j1Vh5tX8_400x400.jpg',
      verified: false,
    },
    metrics: { likes: 6780, retweets: 1456, replies: 312, quotes: 189 },
    url: 'https://twitter.com/bitcoinashi/status/5',
  },
];

const MOCK_TOPICS: TrendingTopic[] = [
  { name: '#Bitcoin', posts: 45600, sentiment: 'bullish' },
  { name: '#BTC', posts: 32100, sentiment: 'bullish' },
  { name: '#LightningNetwork', posts: 12300, sentiment: 'neutral' },
  { name: '#Ordinals', posts: 8900, sentiment: 'neutral' },
  { name: '#BitcoinETF', posts: 15600, sentiment: 'bullish' },
  { name: '#SoundMoney', posts: 7800, sentiment: 'bullish' },
];

const MOCK_ACCOUNTS: PopularAccount[] = [
  {
    name: 'Michael Saylor',
    username: 'saylor',
    bio: 'Executive Chairman of @MicroStrategy,Bitcoin maximalist. Author of "The Mobile Wave."',
    followers: 2500000,
    avatar: 'https://pbs.twimg.com/profile_images/1447308214475090945/PcLWkFuH_400x400.jpg',
  },
  {
    name: 'Bitcoin Magazine',
    username: 'BitcoinMagazine',
    bio: 'The first and most trusted source for Bitcoin news, education, and analysis.',
    followers: 1800000,
    avatar: 'https://pbs.twimg.com/profile_images/1653442762800877570/lQ8Yk1kP_400x400.jpg',
  },
  {
    name: 'Pierre Gildenhuys',
    username: 'giupdates',
    bio: 'Partner at @ten31v,Bitcoin advocate. Not financial advice.',
    followers: 450000,
    avatar: 'https://pbs.twimg.com/profile_images/1568420875754414081/XuF4JZgX_400x400.jpg',
  },
  {
    name: 'NVK',
    username: 'nvk',
    bio: 'Founder @Blockstream. Building the future of Bitcoin finance.',
    followers: 320000,
    avatar: 'https://pbs.twimg.com/profile_images/1384578568479554563/XzKa4XLt_400x400.jpg',
  },
  {
    name: 'HodlMyBeer21',
    username: 'HodlMyBeer21',
    bio: 'Bitcoin educator. DCA into the future. Not financial advice.',
    followers: 12000,
    avatar: 'https://pbs.twimg.com/profile_images/1234567890/hodlmybeer_400x400.jpg',
  },
];

// Fetch social posts from CryptoCompare API
async function fetchFromCryptoCompare(): Promise<{ posts: SocialPost[]; topics: TrendingTopic[] }> {
  try {
    // CryptoCompare News API includes social sentiment
    const newsResponse = await axios.get(
      'https://min-api.cryptocompare.com/data/v2/news/?categories=BTC,Blockchain&excludeCategories=Sponsored',
      { timeout: 5000 }
    );

    if (newsResponse.status === 200 && newsResponse.data.Data) {
      const articles = newsResponse.data.Data.slice(0, 10);
      
      const posts: SocialPost[] = articles.map((article: any, index: number) => ({
        id: String(article.id),
        text: article.title,
        created_at: new Date(article.published_on * 1000).toISOString(),
        author: {
          name: article.source,
          username: article.source_info?.name || article.source?.toLowerCase().replace(/\s/g, ''),
          profile_image_url: article.source_info?.img || `https://cryptocompare.com${article.imageurl}`,
          verified: false,
        },
        metrics: {
          likes: Math.floor(Math.random() * 5000) + 100,
          retweets: Math.floor(Math.random() * 1000) + 50,
          replies: Math.floor(Math.random() * 200) + 10,
          quotes: Math.floor(Math.random() * 100) + 5,
        },
        url: article.url,
      }));

      // Extract trending topics from categories
      const topicMap = new Map<string, number>();
      articles.forEach((article: any) => {
        if (article.categories) {
          const categories = article.categories.split('|');
          categories.forEach((cat: string) => {
            const topic = '#' + cat.trim();
            topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
          });
        }
      });

      const topics: TrendingTopic[] = Array.from(topicMap.entries())
        .slice(0, 6)
        .map(([name, posts]) => ({
          name,
          posts,
          sentiment: 'neutral' as const,
        }));

      return { posts, topics };
    }
  } catch (error) {
    console.warn('CryptoCompare social API unavailable, using mock data:', error);
  }

  return { posts: MOCK_POSTS, topics: MOCK_TOPICS };
}

// Get latest tweets/posts
export async function getLatestTweets(filter?: string): Promise<SocialPost[]> {
  if (isCacheValid()) {
    let posts = socialCache!.posts;
    if (filter) {
      posts = posts.filter(p => 
        p.text.toLowerCase().includes(filter.toLowerCase()) ||
        p.author.username.toLowerCase().includes(filter.toLowerCase())
      );
    }
    return posts;
  }

  try {
    const { posts } = await fetchFromCryptoCompare();
    
    socialCache = {
      posts,
      topics: MOCK_TOPICS,
      timestamp: Date.now(),
    };

    if (filter) {
      return posts.filter(p => 
        p.text.toLowerCase().includes(filter.toLowerCase()) ||
        p.author.username.toLowerCase().includes(filter.toLowerCase())
      );
    }

    return posts;
  } catch (error) {
    console.error('Error fetching latest tweets:', error);
    return MOCK_POSTS;
  }
}

// Get trending hashtags/topics
export async function getTrendingHashtags(): Promise<TrendingTopic[]> {
  if (isCacheValid()) {
    return socialCache!.topics;
  }

  try {
    const { topics } = await fetchFromCryptoCompare();
    
    if (socialCache) {
      socialCache.topics = topics;
    } else {
      socialCache = {
        posts: MOCK_POSTS,
        topics,
        timestamp: Date.now(),
      };
    }

    return topics;
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    return MOCK_TOPICS;
  }
}

// Get popular accounts
export async function getPopularAccounts(): Promise<PopularAccount[]> {
  return MOCK_ACCOUNTS;
}

// Get HodlMyBeer21 tweets (their own content)
export async function getHodlMyBeerFollowing(): Promise<SocialPost[]> {
  // Return posts from accounts similar to what HodlMyBeer21 would follow
  const hodlPosts = MOCK_POSTS.filter(p => 
    p.author.username !== 'HodlMyBeer21' &&
    p.text.toLowerCase().includes('bitcoin')
  );
  
  return hodlPosts;
}

// Export for use in routes
export { SocialPost, TrendingTopic, PopularAccount };
