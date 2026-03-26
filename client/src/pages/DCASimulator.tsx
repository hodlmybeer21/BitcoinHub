'use client';

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bitcoin,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Copy,
  Check,
  ArrowRight,
  Mail,
  Loader2,
} from "lucide-react";

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

const YEARS = Array.from({ length: 14 }, (_, i) => 2012 + i);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatBTC = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value);

const formatSats = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-[#F7931A]/30 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-[#F7931A]">
          {formatBTC(data.btcHeld)} BTC
        </p>
        <p className="text-sm text-foreground">
          {formatCurrency(data.usdValue)}
        </p>
      </div>
    );
  }
  return null;
};

export default function DCASimulator() {
  const [monthlyAmount, setMonthlyAmount] = useState(50);
  const [startYear, setStartYear] = useState(2020);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<DCAResult>({
    queryKey: ["/api/dca-simulator", monthlyAmount, startYear],
    queryFn: async () => {
      const res = await fetch(
        `/api/dca-simulator?monthly=${monthlyAmount}&startYear=${startYear}`
      );
      if (!res.ok) throw new Error("Failed to fetch DCA data");
      return res.json();
    },
  });

  // Simple chart data - yearly aggregation
  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];

    const yearlyData: Record<string, { btcHeld: number; usdValue: number }> = {};

    data.dataPoints.forEach((point) => {
      const year = point.date.split("-")[0];
      if (!yearlyData[year]) {
        yearlyData[year] = { btcHeld: 0, usdValue: 0 };
      }
      yearlyData[year] = {
        btcHeld: point.btcHeld,
        usdValue: point.usdValue,
      };
    });

    return Object.entries(yearlyData).map(([year, values]) => ({
      year,
      btcHeld: values.btcHeld,
      usdValue: values.usdValue,
    }));
  }, [data]);

  const handleCopyShare = async () => {
    if (!data) return;
    const text = `If I'd invested $${monthlyAmount}/month in Bitcoin starting ${startYear}, I'd have ${formatBTC(data.btcAccumulated)} BTC worth ${formatCurrency(data.currentValue)} today. Start your journey at hub.goodbotai.tech`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPositiveReturn = data && data.totalReturn >= 0;

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#F7931A]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-[#F7931A]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#F7931A]/4 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-muted/20 pb-6 mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/30 mb-6">
              <Bitcoin className="h-5 w-5 text-[#F7931A]" />
              <span className="text-sm font-medium text-[#F7931A]">DCA Calculator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              What if you'd started buying{" "}
              <span className="text-[#F7931A]">Bitcoin</span> sooner?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how Dollar Cost Averaging could have changed your financial future
            </p>
          </motion.div>
        </div>
      </header>

      {/* Calculator Section */}
      <div className="relative flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Monthly Amount Card */}
              <Card className="border-muted/30 bg-card/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-[#F7931A]" />
                    Monthly Investment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={monthlyAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        setMonthlyAmount(Math.min(1000, Math.max(10, val)));
                      }}
                      className="text-2xl font-bold bg-background border-2 border-[#F7931A]/30 focus:border-[#F7931A] w-32"
                      min={10}
                      max={1000}
                    />
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <Slider
                    value={[monthlyAmount]}
                    onValueChange={([val]) => setMonthlyAmount(val)}
                    min={10}
                    max={1000}
                    step={10}
                    className="[&_[role=slider]]:bg-[#F7931A] [&_[role=slider]]:border-[#F7931A]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$10</span>
                    <span>$1,000</span>
                  </div>
                </CardContent>
              </Card>

              {/* Start Year Card */}
              <Card className="border-muted/30 bg-card/50 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-[#F7931A]" />
                    Starting Year
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={String(startYear)}
                    onValueChange={(val) => setStartYear(parseInt(val))}
                  >
                    <SelectTrigger className="bg-background border-2 border-[#F7931A]/30 focus:border-[#F7931A] w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year} — ${monthlyAmount}/mo = ${monthlyAmount * 12}/yr
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Results Card */}
              {isLoading ? (
                <Card className="border-muted/30 bg-card/50 backdrop-blur">
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-[#F7931A] animate-spin" />
                  </CardContent>
                </Card>
              ) : data ? (
                <Card className="border-[#F7931A]/30 bg-card/50 backdrop-blur overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#F7931A] to-[#FFB347]" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Your Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* BTC Held - Hero Stat */}
                    <div className="text-center py-4 bg-[#F7931A]/5 rounded-xl border border-[#F7931A]/20">
                      <p className="text-sm text-muted-foreground mb-1">Total Bitcoin Accumulated</p>
                      <p className="text-4xl font-bold text-[#F7931A]">
                        {formatBTC(data.btcAccumulated)}
                      </p>
                      <p className="text-lg font-semibold text-foreground mt-1">
                        {formatCurrency(data.currentValue)}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Invested</p>
                        <p className="text-lg font-semibold">{formatCurrency(data.totalInvested)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Months Invested</p>
                        <p className="text-lg font-semibold">{data.monthsInvested}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">BTC at Start</p>
                        <p className="text-lg font-semibold">${formatCurrency(data.priceAtStart)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">BTC Now</p>
                        <p className="text-lg font-semibold">${formatCurrency(data.priceNow)}</p>
                      </div>
                    </div>

                    {/* Return */}
                    <div className={`rounded-lg p-4 ${isPositiveReturn ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Return</p>
                          <p className={`text-2xl font-bold flex items-center gap-1 ${isPositiveReturn ? "text-green-500" : "text-red-500"}`}>
                            {isPositiveReturn ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                            {isPositiveReturn ? "+" : ""}{formatPercent(data.returnPercent)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {isPositiveReturn ? "Profit" : "Loss"}
                          </p>
                          <p className={`text-xl font-bold ${isPositiveReturn ? "text-green-500" : "text-red-500"}`}>
                            {isPositiveReturn ? "+" : ""}{formatCurrency(data.totalReturn)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sats */}
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Satoshis Accumulated</p>
                      <p className="text-xl font-bold text-[#F7931A]">
                        ₿ {formatSats(data.satsAccumulated)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBTC(data.btcAccumulated)} BTC × 100,000,000 sats
                      </p>
                    </div>

                    {/* Share Button */}
                    <Button
                      onClick={handleCopyShare}
                      className="w-full bg-[#F7931A] hover:bg-[#E67500] text-white font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Share Your Results
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card className="border-red-500/30 bg-red-500/10">
                  <CardContent className="py-8 text-center text-red-500">
                    Failed to load DCA data. Please try again.
                  </CardContent>
                </Card>
              ) : null}
            </motion.div>

            {/* Right Column - Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-muted/30 bg-card/50 backdrop-blur h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5 text-[#F7931A]" />
                    Bitcoin Accumulation Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="btcGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F7931A" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#F7931A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.1)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="year"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              value >= 1 ? `${value.toFixed(1)} BTC` : `${(value * 1000).toFixed(0)}mBTC`
                            }
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="btcHeld"
                            stroke="#F7931A"
                            strokeWidth={2}
                            fill="url(#btcGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      Select a start year to see your accumulation chart
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Based on historical monthly average BTC prices. Your actual returns may vary.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12"
          >
            <Card className="border-[#F7931A]/30 bg-gradient-to-r from-[#F7931A]/10 to-transparent overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#F7931A] to-[#FFB347]" />
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Continue Your Bitcoin Journey
                    </h3>
                    <p className="text-muted-foreground">
                      Learn the fundamentals of Bitcoin, DCA strategy, and building long-term wealth.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      asChild
                      className="bg-[#F7931A] hover:bg-[#E67500] text-white font-semibold"
                    >
                      <Link href="/learn">
                        Continue Learning
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Newsletter */}
            <Card className="border-muted/30 bg-card/50 backdrop-blur mt-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#F7931A]/10">
                      <Mail className="h-5 w-5 text-[#F7931A]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Stay Informed</h4>
                      <p className="text-sm text-muted-foreground">
                        Get Bitcoin insights and DCA tips delivered to your inbox
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="bg-background border-muted/30"
                    />
                    <Button className="bg-[#F7931A] hover:bg-[#E67500] text-white">
                      Subscribe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
