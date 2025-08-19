'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Sparkles, Shield, BarChart3 } from 'lucide-react';
import { Button } from './button';

interface ValueMomentBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function ValueMomentBanner({ isVisible, onDismiss }: ValueMomentBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDismiss = () => {
    setTimeout(onDismiss, 300); // Allow animation to complete
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleRedirect = () => {
    window.open('https://raxit.ai', '_blank');
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="fixed bottom-4 right-4 z-50 max-w-md"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Initial compact state */}
            {!isExpanded ? (
              <motion.div
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={handleExpand}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Loving the insights?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tap to see how this applies to your AI →
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Expanded state with full message */
              <motion.div
                initial={{ height: 'auto' }}
                animate={{ height: 'auto' }}
                className="p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      Ready for the next level?
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You've explored how AI models perform in gray-zone scenarios. 
                    Now imagine getting this same depth of analysis for <em>your own</em> AI systems.
                  </p>
                  
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    {/* <Shield className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" /> */}
                    <span>Turn benchmarking insights into operational risk assessment</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleRedirect}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-8"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Explore raxIT AI
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-muted-foreground hover:text-foreground text-sm h-8 px-3"
                  >
                    Maybe later
                  </Button>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Join 500+ teams using AI security assessment
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}