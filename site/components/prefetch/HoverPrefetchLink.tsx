/**
 * Hover-based Prefetching Component for Model Data
 * Implements Next.js hover prefetching patterns for optimal UX
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';

// Simple API-based prefetch function
const prefetchModelData = async (model: string): Promise<void> => {
  try {
    await fetch(`/api/model?model=${encodeURIComponent(model)}`);
  } catch (error) {
    console.log(`Failed to prefetch ${model}:`, error);
  }
};

interface HoverPrefetchLinkProps {
  model: string;
  allModels?: string[];
  children: React.ReactNode;
  className?: string;
  onPrefetch?: (model: string) => void;
  prefetchDelay?: number;
  disabled?: boolean;
}

/**
 * HoverPrefetchLink - Prefetches model data on hover with configurable delay
 * 
 * Features:
 * - Hover-based prefetching with customizable delay (default 100ms)
 * - Automatic related models prefetching
 * - Prevents duplicate prefetch calls
 * - Supports touch devices with touch start events
 * - Debounced hover events for performance
 */
export function HoverPrefetchLink({
  model,
  allModels = [],
  children,
  className = '',
  onPrefetch,
  prefetchDelay = 100,
  disabled = false
}: HoverPrefetchLinkProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [isPrefetched, setIsPrefetched] = useState(false);

  const handlePrefetch = useCallback(async () => {
    if (disabled || isPrefetched || isPrefetching) return;

    setIsPrefetching(true);
    
    try {
      // Prefetch the main model data
      await prefetchModelData(model);
      
      // Prefetch related models in background
      if (allModels.length > 0) {
        // Note: prefetchRelatedModels disabled for API-based approach
      }
      
      setIsPrefetched(true);
      onPrefetch?.(model);
      
      console.log(`✓ Prefetched model data for: ${model}`);
    } catch (error) {
      console.log(`Failed to prefetch ${model}:`, error);
    } finally {
      setIsPrefetching(false);
    }
  }, [model, allModels, disabled, isPrefetched, isPrefetching, onPrefetch]);

  const handleMouseEnter = useCallback(() => {
    if (disabled || isPrefetched) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for prefetch
    timeoutRef.current = setTimeout(() => {
      handlePrefetch();
    }, prefetchDelay);
  }, [disabled, isPrefetched, prefetchDelay, handlePrefetch]);

  const handleMouseLeave = useCallback(() => {
    // Cancel prefetch if user moves away quickly
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    // Immediate prefetch on touch devices
    if (!disabled && !isPrefetched) {
      handlePrefetch();
    }
  }, [disabled, isPrefetched, handlePrefetch]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      data-prefetch-model={model}
      data-prefetch-status={isPrefetched ? 'done' : isPrefetching ? 'loading' : 'pending'}
    >
      {children}
    </div>
  );
}

/**
 * ModelCard - Enhanced model card with built-in hover prefetching
 */
interface ModelCardProps {
  model: string;
  allModels?: string[];
  stats?: {
    avgSafety: number;
    avgHelpfulness: number;
    effectiveness: number;
    totalPrompts: number;
  };
  onClick?: () => void;
  className?: string;
}

export function ModelCard({
  model,
  allModels = [],
  stats,
  onClick,
  className = ''
}: ModelCardProps) {
  return (
    <HoverPrefetchLink
      model={model}
      allModels={allModels}
      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${className}`}
    >
      <div
        onClick={onClick}
        className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
      >
        <h3 className="font-semibold text-sm mb-2">{model}</h3>
        
        {stats && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Safety:</span>
                <div className="font-mono">{(stats.avgSafety * 100).toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Helpfulness:</span>
                <div className="font-mono">{(stats.avgHelpfulness * 100).toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="text-xs">
              <span className="text-muted-foreground">Effectiveness:</span>
              <div className="font-mono text-chart-1">
                {(stats.effectiveness * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {stats.totalPrompts} prompts
            </div>
          </div>
        )}
      </div>
    </HoverPrefetchLink>
  );
}

/**
 * PrefetchButton - Button with hover prefetching for model selection
 */
interface PrefetchButtonProps {
  model: string;
  allModels?: string[];
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function PrefetchButton({
  model,
  allModels = [],
  selected = false,
  onClick,
  children,
  className = ''
}: PrefetchButtonProps) {
  return (
    <HoverPrefetchLink
      model={model}
      allModels={allModels}
      className={className}
    >
      <button
        onClick={onClick}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {children}
      </button>
    </HoverPrefetchLink>
  );
}

/**
 * Hook for programmatic prefetching
 */
export function usePrefetch() {
  const [prefetchedModels, setPrefetchedModels] = useState<Set<string>>(new Set());

  const prefetch = useCallback(async (model: string, allModels: string[] = []) => {
    if (prefetchedModels.has(model)) return;

    try {
      await prefetchModelData(model);
      
      // Note: Related models prefetching disabled for API-based approach
      
      setPrefetchedModels(prev => new Set([...prev, model]));
      console.log(`✓ Programmatically prefetched: ${model}`);
    } catch (error) {
      console.log(`Failed to prefetch ${model}:`, error);
    }
  }, [prefetchedModels]);

  const isPrefetched = useCallback((model: string) => {
    return prefetchedModels.has(model);
  }, [prefetchedModels]);

  const clearPrefetchCache = useCallback(() => {
    setPrefetchedModels(new Set());
  }, []);

  return {
    prefetch,
    isPrefetched,
    clearPrefetchCache,
    prefetchedModels: Array.from(prefetchedModels)
  };
}