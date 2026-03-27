'use client';

import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, Sparkles, TrendingUp, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Subscription failed');
      }
      
      setSubscribed(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: Sparkles,
      title: 'Weekly Bitcoin Insights',
      description: 'Deep dives into Bitcoin fundamentals, on-chain metrics, and market analysis delivered every week.'
    },
    {
      icon: TrendingUp,
      title: 'Inflation & Market Updates',
      description: 'Stay informed on macroeconomic trends, inflation data, and how it affects your purchasing power.'
    },
    {
      icon: BookOpen,
      title: 'Learning Path Updates',
      description: 'Be the first to know about new simulations, lessons, and educational resources we add.'
    }
  ];

  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Stay Informed on Bitcoin, Inflation, and Your Financial Future
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of learners receiving weekly insights on Bitcoin, market analysis, and new educational resources. No spam, ever.
          </p>
        </motion.div>

        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20 p-6 md:p-8">
            {subscribed ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-foreground mb-2">You're In!</h3>
                <p className="text-muted-foreground mb-6">Check your email to confirm your subscription.</p>
                <Button variant="outline" onClick={() => setSubscribed(false)}>
                  Subscribe another email
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    required
                    disabled={loading}
                    className="flex-1 bg-background/50 border-muted/20 focus:border-primary text-base h-12"
                  />
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                        Subscribing...
                      </>
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
                {error && (
                  <p className="text-sm text-red-500 text-center mt-3">{error}</p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Free forever. Unsubscribe anytime.
                </p>
              </>
            )}
          </Card>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            What You'll Get
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="bg-card border-muted/20 p-6">
                <CardHeader className="p-0 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-sm">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* CTA to Learning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Prefer to learn at your own pace?
          </p>
          <Link href="/learn">
            <Button variant="outline" size="lg">
              Explore Learning Paths
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Newsletter;
