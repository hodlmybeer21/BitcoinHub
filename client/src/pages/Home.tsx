'use client';

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Users, 
  LineChart, 
  Zap, 
  GraduationCap, 
  Shield, 
  Target,
  ArrowRight,
  BookOpen,
  Clock,
  ChevronDown,
  BarChart3,
  Scale,
  Coins,
  CheckCircle2,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface MarketData {
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const BitcoinIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c3 .6 5.2.3 6.1-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.5zm-4 5.5c-.6 2.1-4.2 1-5.4.7l1 3.9c1.2.3 4.8.9 5.3-.6.4-1.3-.3-2.6-1.9-3zm.6-5.5c-.5 1.9-3.7.9-4.7.7l.9-3.6c1.1.3 4.4.8 4.8 1.1.4.4.3 1.6-.6 1.8h-.4z" fill="white"/>
  </svg>
);

const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    {/* Grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(247,147,26,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(247,147,26,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
    
    {/* Animated gradient orbs */}
    <motion.div
      className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#F7931A]/5 blur-3xl"
      animate={{
        x: [0, 50, 0],
        y: [0, 30, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#F7931A]/3 blur-3xl"
      animate={{
        x: [0, -30, 0],
        y: [0, -50, 0],
        scale: [1, 1.2, 1]
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

const StatCard = ({ icon: Icon, value, label }: { icon: any; value: string; label: string }) => (
  <div className="flex items-center gap-3 px-6 py-3 bg-card/50 rounded-lg border border-muted/20">
    <Icon className="w-5 h-5 text-primary" />
    <div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);

const TestimonialCard = ({ quote, author, role }: { quote: string; author: string; role: string }) => (
  <Card className="bg-card/50 border-muted/20 p-6">
    <p className="text-muted-foreground italic mb-4">&quot;{quote}&quot;</p>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-primary font-bold">{author.charAt(0)}</span>
      </div>
      <div>
        <div className="font-semibold text-foreground">{author}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  </Card>
);

const learningPaths = [
  {
    id: 'beginner-fundamentals',
    icon: GraduationCap,
    title: 'Beginner Fundamentals',
    description: 'Start here if you\'re new to Bitcoin. Learn the basics of money, how Bitcoin works, and why it matters.',
    lessons: 8,
    difficulty: 'Beginner',
    color: 'bg-green-500'
  },
  {
    id: 'monetary-history',
    icon: BookOpen,
    title: 'Bitcoin & Monetary History',
    description: 'Explore the history of money, the gold standard, Bretton Woods, and how Bitcoin fits into the story.',
    lessons: 6,
    difficulty: 'Intermediate',
    color: 'bg-blue-500'
  },
  {
    id: 'hard-assets',
    icon: Shield,
    title: 'Hard Assets & Wealth Preservation',
    description: 'Understand why Bitcoin is called "hard money" and how it compares to gold, real estate, and other stores of value.',
    lessons: 5,
    difficulty: 'Intermediate',
    color: 'bg-purple-500'
  },
  {
    id: 'inflation-problem',
    icon: TrendingUp,
    title: 'The Inflation Problem',
    description: 'Dive deep into inflation, currency debasement, and why Bitcoin\'s fixed supply matters for your future.',
    lessons: 7,
    difficulty: 'Advanced',
    color: 'bg-red-500'
  }
];

const featuredTools = [
  {
    icon: BarChart3,
    title: 'Live BTC Analytics',
    description: 'Real-time Bitcoin market data, whale tracking, and on-chain metrics all in one dashboard.',
    link: '/analytics',
    cta: 'View Dashboard'
  },
  {
    icon: Scale,
    title: 'Legislation Tracker',
    description: 'Stay informed about Bitcoin regulations, SEC decisions, and government policies worldwide.',
    link: '/legislation',
    cta: 'Explore Policies'
  },
  {
    icon: Coins,
    title: 'Value Tracker',
    description: 'Track the purchasing power of Bitcoin, gold, and fiat currencies over time.',
    link: 'https://tracker.goodbotai.tech',
    cta: 'Open Tracker',
    external: true
  }
];

const faqItems = [
  {
    question: "What is Bitcoin and why should I learn about it?",
    answer: "Bitcoin is a decentralized digital currency created in 2009 by an anonymous person or group known as Satoshi Nakamoto. Unlike traditional currencies, Bitcoin operates on a peer-to-peer network without banks or governments controlling its supply. Learning about Bitcoin helps you understand the evolving nature of money and its potential impact on your financial future."
  },
  {
    question: "Is this really free?",
    answer: "Yes, BitcoinHub is completely free to use. We believe education should be accessible to everyone. All learning paths, simulations, and analytics are available at no cost. Our goal is to help as many people as possible understand Bitcoin and make informed financial decisions."
  },
  {
    question: "How long does it take to complete a learning path?",
    answer: "Each learning path takes between 30 minutes to 2 hours to complete, depending on your pace and how deeply you want to explore each topic. You can progress at your own speed and return to any lesson at any time. Our interactive simulations add an engaging hands-on element to the learning experience."
  },
  {
    question: "What's the best way to start learning about Bitcoin?",
    answer: "Start with our Beginner Fundamentals path, which covers the basics of what Bitcoin is, how it works, and why it was created. From there, you can explore topics that interest you most—whether that's the history of money, inflation, or wealth preservation strategies."
  },
  {
    question: "What makes BitcoinHub different from other Bitcoin sites?",
    answer: "Unlike sites focused on price speculation or trading, BitcoinHub is an education platform. We use interactive simulations, real market data, and structured learning paths to help you truly understand Bitcoin and the monetary system. We've also built 13 unique games that make complex economic concepts engaging and memorable."
  },
  {
    question: "Is this financial advice?",
    answer: "No, BitcoinHub is purely an educational platform. We don't provide investment advice, financial planning, or personalized recommendations. We believe that understanding how money and Bitcoin work empowers you to make your own informed decisions. Always do your own research and consider consulting financial professionals before making investment decisions."
  }
];

const HowItWorksStep = ({ 
  number, 
  icon: Icon, 
  title, 
  description 
}: { 
  number: number; 
  icon: any; 
  title: string; 
  description: string;
}) => (
  <motion.div 
    className="relative flex flex-col items-center text-center"
    variants={fadeInUp}
  >
    <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-primary" />
    </div>
    <div className="absolute -top-2 -left-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
      {number}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-xs">{description}</p>
  </motion.div>
);

const Home = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: marketData } = useQuery<MarketData>({
    queryKey: ['/api/bitcoin/market-data'],
    refetchInterval: 60000,
  });

  useEffect(() => {
    // Add dark class to html if not present
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // TODO: Integrate with newsletter service
      setSubscribed(true);
      setEmail('');
    }
  };

  const btcPrice = marketData?.price ?? 0;
  const priceChange = marketData?.change24h ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <HeroBackground />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* Live BTC Price Badge */}
            {btcPrice > 0 && (
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-card/80 border border-muted/20 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <BitcoinIcon className="w-5 h-5" />
                  <span className="font-mono font-bold text-foreground">${formatCurrency(btcPrice).replace('$', '')}</span>
                </div>
                <div className={`flex items-center gap-1 text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 transform rotate-180" />}
                  <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%</span>
                </div>
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                  LIVE
                </Badge>
              </motion.div>
            )}

            {/* Main Headline */}
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight max-w-4xl mx-auto"
            >
              The Bitcoin Education Platform That Actually Teaches You{" "}
              <span className="text-primary">How Money Works</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp} 
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              13 interactive simulations, live market data, and a community of learners who want to understand money, inflation, and why Bitcoin exists — not just speculate on price.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/learn">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                  Start Learning Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" size="lg" className="font-semibold px-8">
                  See Live Analytics
                  <BarChart3 className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>

            {/* Hero Bitcoin Visual */}
            <motion.div variants={fadeInUp} className="relative mt-12">
              <div className="relative mx-auto w-48 h-48">
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.02, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="w-full h-full"
                >
                  <BitcoinIcon className="w-full h-full drop-shadow-2xl" />
                </motion.div>
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl -z-10" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </motion.div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="bg-card/50 border-y border-muted/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} value="47,000+" label="Learners" />
            <StatCard icon={Zap} value="13" label="Interactive Simulations" />
            <StatCard icon={LineChart} value="Real-Time" label="Market Data" />
            <StatCard icon={CheckCircle2} value="Free" label="Forever" />
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard 
              quote="I finally understand why inflation matters and how Bitcoin fixes it. The simulations made concepts click that I'd struggled with for years."
              author="Michael R."
              role="Small Business Owner"
            />
            <TestimonialCard 
              quote="Best educational platform for Bitcoin. I've read books and taken courses, but the interactive games here are unmatched."
              author="Sarah K."
              role="Financial Analyst"
            />
            <TestimonialCard 
              quote="Started as a skeptic. After completing the learning paths, I now have real conviction in my Bitcoin investment."
              author="David L."
              role="Software Engineer"
            />
          </div>
        </div>
      </section>

      {/* WHY BITCOIN EDUCATION SECTION */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Bitcoin Education?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              In a world of infinite digital money, understanding Bitcoin isn't optional — it's essential for protecting your family's future.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeInUp}>
              <Card className="bg-card border-muted/20 p-6 h-full hover:border-primary/50 transition-colors">
                <CardHeader className="p-0 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle>Understand the System You're Living In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Most people use money every day without understanding how it works — or how it can be manipulated. Bitcoin education gives you the framework to comprehend the monetary system, central banking, and why your purchasing power has been steadily eroding.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-card border-muted/20 p-6 h-full hover:border-primary/50 transition-colors">
                <CardHeader className="p-0 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle>Preserve Your Family's Purchasing Power</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    With central banks printing money at record rates, traditional savings lose value every year. Learning about Bitcoin's fixed supply of 21 million coins and its properties as "hard money" helps you make informed decisions to protect your family's wealth for future generations.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-card border-muted/20 p-6 h-full hover:border-primary/50 transition-colors">
                <CardHeader className="p-0 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle>Build Conviction Instead of Speculation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Price charts alone don't build lasting conviction. When you understand why Bitcoin exists, how it works technically, and why it matters historically, you're equipped to hold through volatility with confidence — not fear.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* LEARNING PATHS SHOWCASE */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Featured Learning Paths
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Structured education from beginner to advanced. Choose your path and start building real understanding.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-6"
          >
            {learningPaths.map((path) => (
              <motion.div key={path.id} variants={fadeInUp}>
                <Card className="bg-card border-muted/20 p-6 h-full hover:shadow-lg hover:border-primary/30 transition-all group">
                  <CardHeader className="p-0 mb-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-14 h-14 rounded-xl ${path.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <path.icon className="w-7 h-7 text-white" />
                      </div>
                      <Badge variant="outline" className={`
                        ${path.difficulty === 'Beginner' ? 'bg-green-500/10 text-green-500 border-green-500/30' : ''}
                        ${path.difficulty === 'Intermediate' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : ''}
                        ${path.difficulty === 'Advanced' ? 'bg-red-500/10 text-red-500 border-red-500/30' : ''}
                      `}>
                        {path.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mt-4">{path.title}</CardTitle>
                    <CardDescription className="mt-2">{path.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {path.lessons} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          ~{path.lessons * 10} min
                        </span>
                      </div>
                      <Link href="/learn">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                          Start Free
                          <ArrowRight className="ml-1 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp} className="text-center mt-10">
            <Link href="/learn">
              <Button variant="outline" size="lg">
                View All Learning Paths
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Getting started is simple. Choose your path, learn by doing, and apply what you discover.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-12 relative"
          >
            {/* Connecting lines */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            
            <HowItWorksStep
              number={1}
              icon={GraduationCap}
              title="Choose Your Path"
              description="From absolute beginner to advanced, select the learning track that matches your current knowledge level and goals."
            />
            <HowItWorksStep
              number={2}
              icon={Zap}
              title="Learn by Doing"
              description="Engage with interactive simulations and games that make complex economic concepts tangible and memorable."
            />
            <HowItWorksStep
              number={3}
              icon={TrendingUp}
              title="Apply What You Learn"
              description="Access real market data, connect with our community, and watch your understanding translate into genuine conviction."
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURED TOOLS */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Featured Tools
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Enhance your learning with real-time data and powerful tracking tools.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {featuredTools.map((tool) => (
              <motion.div key={tool.title} variants={fadeInUp}>
                <Card className="bg-card border-muted/20 p-6 h-full hover:shadow-lg hover:border-primary/30 transition-all group">
                  <CardHeader className="p-0 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <tool.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{tool.description}</p>
                    <Link href={tool.link}>
                      <Button variant="outline" className="w-full group">
                        {tool.cta}
                        {tool.external ? (
                          <ExternalLink className="ml-2 w-4 h-4" />
                        ) : (
                          <ArrowRight className="ml-2 w-4 h-4" />
                        )}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* NEWSLETTER SIGNUP */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 p-8 md:p-12">
              <CardHeader className="text-center p-0 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl">Get Weekly Bitcoin Education</CardTitle>
                <CardDescription className="text-base mt-2">
                  Join thousands of learners receiving weekly insights on Bitcoin, market analysis, and new learning resources. No spam, ever.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {subscribed ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">You're In!</h3>
                    <p className="text-muted-foreground">Check your email to confirm your subscription.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1 bg-background/50 border-muted/20 focus:border-primary"
                    />
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      Subscribe
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </form>
                )}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  TODO: Newsletter integration pending. Form UI complete.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground">
              Everything you need to know about BitcoinHub
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <AccordionItem value={`item-${index}`} className="border-muted/20">
                    <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <BitcoinIcon className="w-24 h-24 mx-auto opacity-20" />
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Understand Money?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start your Bitcoin education journey today. No payment required, no investment advice — just knowledge that matters.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/learn">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                  Start Learning Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" size="lg" className="font-semibold px-8">
                  Explore Analytics
                  <BarChart3 className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
