'use client';

import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SubstackSignup from '@/components/SubstackSignup';
import { NEWSLETTER_NAME, NEWSLETTER_TAGLINE } from '@/lib/newsletter';

const Newsletter = () => {
  const benefits = [
    {
      icon: Sparkles,
      title: 'Bitcoin Cycle Notes',
      description: 'Where we are in the cycle, with the data behind it.'
    },
    {
      icon: TrendingUp,
      title: 'Macro & Liquidity',
      description: 'Inflation, rates and money supply, and what they mean for your purchasing power.'
    },
    {
      icon: BookOpen,
      title: 'Learning Path Updates',
      description: 'Hear about new simulations, lessons and tools added to BitcoinHub.'
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
            {NEWSLETTER_NAME}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {NEWSLETTER_TAGLINE} The BitcoinHub newsletter lives on Substack. Subscribe below and Substack sends the confirmation email.
          </p>
        </motion.div>

        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20 p-6 md:p-8">
            <SubstackSignup />
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
