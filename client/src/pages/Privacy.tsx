'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background py-12 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Privacy Policy
            </h1>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none">
            <div className="bg-card border border-muted/20 rounded-xl p-6 md:p-8">
              <p className="text-muted-foreground text-center py-12">
                <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-lg text-lg font-medium">
                  Coming Soon
                </span>
              </p>
              <p className="text-muted-foreground text-center">
                Our full privacy policy is being developed. In the meantime, we collect minimal data necessary to provide our services. We do not sell your personal information.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
