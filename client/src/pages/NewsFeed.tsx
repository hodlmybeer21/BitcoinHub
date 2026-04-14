import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, RefreshCw, Clock, Calendar, ExternalLink, Newspaper,
  TrendingUp, TrendingDown, AlertTriangle, Activity, Zap,
  BarChart2, Hash, DollarSign, Users, ArrowUpRight, ArrowDownRight
} from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  categories: string[];
  imageUrl: string;
}

interface WhaleAlert {
  hash: string;
  sizeBtc: number;
  sizeUsd: number;
  feeBtc: number;
  inputs: number;
  outputs: number;
  time: string;
}

interface NewsHubData {
  news: NewsItem[];
  btcPrice: number;
  change24h: number;
  fng: number;
  fngLabel: string;
  onChain: {
    hashrate: number;
    difficulty: number;
    txnVolume: number;
    minersRevenue: number;
    activeAddrs: number;
  };
  whales: WhaleAlert[];
  fetchedAt: string;
}

const CATEGORIES = ["All", "Bitcoin", "ETF", "Mining", "Regulation", "Price", "Whale", "Institutional", "Adoption"];

function formatBtc(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + " EH/s";
  if (num >= 1e9) return (num / 1e9).toFixed(1) + " GH/s";
  return num.toString();
}

function formatUsd(num: number): string {
  if (num >= 1e9) return "$" + (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return "$" + (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
  return "$" + num.toFixed(2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fngColor(value: number): string {
  if (value <= 20) return "text-red-500";
  if (value <= 40) return "text-orange-500";
  if (value <= 60) return "text-yellow-500";
  if (value <= 80) return "text-green-500";
  return "text-emerald-500";
}

// ─── Live BTC Banner ───────────────────────────────────────────────────────────
const LiveTicker = ({ data }: { data: NewsHubData | undefined }) => {
  if (!data) return (
    <div className="bg-gradient-to-r from-[#0f0f14] to-[#1a1a24] border-b border-[#2a2a3a] px-4 py-3">
      <div className="flex items-center gap-6 overflow-hidden">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-32" />)}
      </div>
    </div>
  );

  const price = data.btcPrice?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  const change = data.change24h || 0;
  const isUp = change >= 0;

  return (
    <div className="bg-gradient-to-r from-[#0f0f14] via-[#1a1a24] to-[#0f0f14] border-b border-[#2a2a3a] px-4 py-3">
      <div className="flex items-center gap-6 overflow-hidden text-sm">
        {/* BTC Price */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#f7931a] animate-pulse" />
          <span className="text-[#f7931a] font-bold">₿ BTC</span>
          <span className="text-white font-bold">{price}</span>
          <span className={`flex items-center gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(2)}%
          </span>
        </div>

        <div className="w-px h-4 bg-[#2a2a3a]" />

        {/* Fear & Greed */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[#6b7280]">F&G</span>
          <span className={`font-bold ${fngColor(data.fng)}`}>{data.fng}</span>
          <span className={`text-xs ${fngColor(data.fng)}`}>{data.fngLabel}</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a3a]" />

        {/* Hashrate */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Hash className="w-3 h-3 text-[#6b7280]" />
          <span className="text-[#6b7280]">HR:</span>
          <span className="text-white">{formatBtc(data.onChain?.hashrate)}</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a3a]" />

        {/* Active TXs */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Activity className="w-3 h-3 text-[#6b7280]" />
          <span className="text-[#6b7280]">TXs:</span>
          <span className="text-white">{(data.onChain?.activeAddrs / 1e6).toFixed(1)}M</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a3a]" />

        {/* Volume */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <DollarSign className="w-3 h-3 text-[#6b7280]" />
          <span className="text-[#6b7280]">Vol:</span>
          <span className="text-white">{formatUsd(data.onChain?.txnVolume)}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="text-[#4b5563] text-xs">
            Updated {timeAgo(data.fetchedAt)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Breaking News Alert ───────────────────────────────────────────────────────
const BreakingAlert = ({ item }: { item: NewsItem }) => (
  <a
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/40 rounded-lg hover:bg-red-950/60 transition-colors group"
  >
    <div className="flex-shrink-0 mt-0.5">
      <Zap className="w-4 h-4 text-red-400 fill-red-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-red-400 border-red-700/50 text-[10px] px-1.5 py-0">
          BREAKING
        </Badge>
        <span className="text-[10px] text-[#6b7280]">{item.source}</span>
      </div>
      <h4 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-1">
        {item.title}
      </h4>
      <p className="text-xs text-[#9ca3af] mt-0.5 line-clamp-1">{item.description}</p>
    </div>
    <ExternalLink className="w-3 h-3 text-[#6b7280] flex-shrink-0 mt-1" />
  </a>
);

// ─── News Card ─────────────────────────────────────────────────────────────────
const NewsCard = ({ item }: { item: NewsItem }) => (
  <Card className="bg-[#111118] border-[#1e1e2e] hover:border-[#2e2e4a] transition-all group">
    <CardContent className="p-4">
      <div className="flex gap-4">
        {item.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={item.imageUrl}
              alt=""
              className="w-20 h-20 object-cover rounded-lg bg-[#1a1a24]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#2a2a3a] text-[#9ca3af]">
              {item.source}
            </Badge>
            {item.categories.slice(0, 2).map(cat => (
              <Badge key={cat} className="text-[10px] px-1.5 py-0 bg-[#1a2a3a] text-[#60a5fa] border-0">
                {cat}
              </Badge>
            ))}
          </div>
          <h3 className="font-semibold text-[#e5e7eb] group-hover:text-white transition-colors line-clamp-2 text-sm leading-snug">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.title}
            </a>
          </h3>
          <p className="text-xs text-[#6b7280] mt-1.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] text-[#4b5563] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(item.publishedAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[#6b7280] hover:text-white"
              asChild
            >
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Whale Feed ────────────────────────────────────────────────────────────────
const WhaleFeed = ({ whales }: { whales: WhaleAlert[] }) => {
  if (!whales?.length) {
    return (
      <Card className="bg-[#111118] border-[#1e1e2e]">
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#60a5fa]" />
            Whale Activity
          </h3>
          <p className="text-xs text-[#6b7280]">50+ BTC transactions</p>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[#6b7280] text-center py-4">No large transactions detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#111118] border-[#1e1e2e]">
      <CardHeader className="pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#60a5fa]" />
          Whale Activity
        </h3>
        <p className="text-xs text-[#6b7280]">50+ BTC on-chain</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {whales.map((tx) => (
          <div key={tx.hash} className="p-2.5 bg-[#1a1a24] rounded-lg border border-[#2a2a3a] hover:border-[#3a3a5a] transition-colors">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3 text-[#f7931a]" />
                <span className="text-sm font-bold text-[#f7931a]">{tx.sizeBtc} BTC</span>
              </div>
              <span className="text-[10px] text-[#6b7280]">{formatUsd(tx.sizeUsd)}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
              <span>{tx.inputs} in</span>
              <span>→</span>
              <span>{tx.outputs} out</span>
              <span className="ml-auto">{timeAgo(tx.time)}</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <a
                href={`https://blockchain.com/btc/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#60a5fa] hover:underline flex items-center gap-0.5"
              >
                View on-chain <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ─── On-Chain Snapshot ─────────────────────────────────────────────────────────
const OnChainSnapshot = ({ data }: { data: NewsHubData | undefined }) => {
  if (!data) return null;
  const { onChain } = data;

  const metrics = [
    { label: "Hash Rate", value: formatBtc(onChain?.hashrate), icon: Hash, color: "text-[#60a5fa]" },
    { label: "Difficulty", value: (onChain?.difficulty / 1e12).toFixed(2) + "T", icon: BarChart2, color: "text-[#a78bfa]" },
    { label: "TX Volume", value: formatUsd(onChain?.txnVolume), icon: DollarSign, color: "text-green-400" },
    { label: "Active Addrs", value: (onChain?.activeAddrs / 1e6).toFixed(1) + "M", icon: Users, color: "text-[#fb923c]" },
  ];

  return (
    <Card className="bg-[#111118] border-[#1e1e2e]">
      <CardHeader className="pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#60a5fa]" />
          On-Chain Snapshot
        </h3>
        <p className="text-xs text-[#6b7280]">Live blockchain data</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center justify-between p-2 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
            <div className="flex items-center gap-2">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-xs text-[#9ca3af]">{label}</span>
            </div>
            <span className={`text-xs font-semibold ${color}`}>{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const NewsFeed = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<NewsHubData>({
    queryKey: ["/api/news", refreshKey],
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Refresh every minute
  });

  const news: NewsItem[] = data?.news || [];
  const whales: WhaleAlert[] = data?.whales || [];

  const filtered = news.filter(item => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "All" ||
      item.categories.some(c => c.toLowerCase() === activeTab.toLowerCase());
    return matchesSearch && matchesTab;
  });

  const breaking = filtered.slice(0, 2);
  const mainNews = filtered.slice(2);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetch();
  };

  return (
    <div className="min-h-screen bg-[#0a0a10]">
      {/* Live Ticker Banner */}
      <LiveTicker data={data} />

      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-[#f7931a]" />
              Bitcoin News Hub
            </h1>
            <p className="text-sm text-[#6b7280] mt-1">
              Live feeds · On-chain data · Whale tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dataUpdatedAt ? (
              <span className="text-xs text-[#4b5563]">
                {Math.round((Date.now() - dataUpdatedAt) / 1000)}s ago
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-[#2a2a3a] text-[#9ca3af] hover:text-white hover:border-[#4a4a6a]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Breaking News */}
        {breaking.length > 0 && (
          <div className="mb-6 space-y-2">
            {breaking.map(item => (
              <BreakingAlert key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: News Feed */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search + Tabs */}
            <Card className="bg-[#111118] border-[#1e1e2e]">
              <CardContent className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7280]" />
                  <Input
                    type="text"
                    placeholder="Search news..."
                    className="pl-9 bg-[#1a1a24] border-[#2a2a3a] text-sm placeholder:text-[#6b7280]"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Tabs */}
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <Button
                        key={cat}
                        variant={activeTab === cat ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab(cat)}
                        className={`text-xs px-3 h-7 ${
                          activeTab === cat
                            ? 'bg-[#f7931a] hover:bg-[#e8850e] text-black font-semibold'
                            : 'text-[#9ca3af] hover:text-white hover:bg-[#1e1e2e]'
                        }`}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* News List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Card key={i} className="bg-[#111118] border-[#1e1e2e]">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : mainNews.length === 0 ? (
              <Card className="bg-[#111118] border-[#1e1e2e]">
                <CardContent className="p-8 text-center">
                  <Newspaper className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
                  <p className="text-[#6b7280]">No articles found</p>
                  <p className="text-xs text-[#4b5563] mt-1">Try a different category or search term</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {mainNews.map((item, i) => (
                  <div key={item.id}>
                    <NewsCard item={item} />
                    {i < mainNews.length - 1 && <Separator className="my-1 bg-[#1e1e2e]" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            {/* Fear & Greed Gauge */}
            <Card className="bg-[#111118] border-[#1e1e2e] overflow-hidden">
              <CardHeader className="pb-1">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#f7931a]" />
                  Fear & Greed Index
                </h3>
              </CardHeader>
              <CardContent>
                {data ? (
                  <div className="flex flex-col items-center py-2">
                    <div className={`text-4xl font-black ${fngColor(data.fng)}`}>
                      {data.fng}
                    </div>
                    <div className={`text-sm font-medium ${fngColor(data.fng)}`}>
                      {data.fngLabel}
                    </div>
                    <div className="w-full mt-3">
                      {/* Gauge bar */}
                      <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                      <div className="flex justify-between text-[10px] text-[#4b5563] mt-1">
                        <span>Extreme Fear</span>
                        <span>Greed</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4"><Skeleton className="h-16 w-full" /></div>
                )}
              </CardContent>
            </Card>

            {/* Whale Feed */}
            <WhaleFeed whales={whales} />

            {/* On-Chain Snapshot */}
            <OnChainSnapshot data={data} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;
