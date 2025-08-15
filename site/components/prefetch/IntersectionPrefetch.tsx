/**
 * Intersection Observer Prefetching Components
 * Prefetches content when elements enter the viewport for optimal performance
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Simple API-based prefetch function
const prefetchModelData = async (model: string): Promise<void> => {
  try {
    await fetch(`/api/model?model=${encodeURIComponent(model)}`);
  } catch (error) {
    console.log(`Failed to prefetch ${model}:`, error);
  }
};

interface IntersectionPrefetchProps {
  model: string;
  allModels?: string[];
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  onPrefetch?: (model: string) => void;
  disabled?: boolean;
}

/**
 * IntersectionPrefetch - Prefetches model data when element enters viewport
 * 
 * Features:
 * - Configurable intersection thresholds and margins
 * - Automatic cleanup and memory management
 * - Support for related model prefetching
 * - Prevents duplicate prefetch calls
 * - Optimized for performance with proper cleanup
 */
export function IntersectionPrefetch({
  model,
  allModels = [],
  children,
  className = '',
  threshold = 0.1, // Trigger when 10% visible
  rootMargin = '50px', // Start prefetching 50px before entering viewport
  onPrefetch,
  disabled = false
}: IntersectionPrefetchProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const handlePrefetch = useCallback(async () => {
    if (disabled || isPrefetched || isPrefetching) return;

    setIsPrefetching(true);
    
    try {
      // Prefetch the main model data
      await prefetchModelData(model);
      
      // Prefetch related models in background
      if (allModels.length > 0) {
        setTimeout(() => {
          // Note: prefetchRelatedModels is currently disabled due to API-based approach
        }, 100); // Small delay to not overwhelm
      }
      
      setIsPrefetched(true);
      onPrefetch?.(model);
      
      console.log(`📡 Intersection prefetched: ${model}`);
    } catch (error) {
      console.log(`Failed to intersection prefetch ${model}:`, error);
    } finally {
      setIsPrefetching(false);
    }
  }, [model, allModels, disabled, isPrefetched, isPrefetching, onPrefetch]);

  useEffect(() => {
    if (disabled || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isPrefetched && !isPrefetching) {
            handlePrefetch();
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, disabled, isPrefetched, isPrefetching, handlePrefetch]);

  return (
    <div
      ref={elementRef}
      className={className}
      data-intersection-model={model}
      data-intersection-status={isPrefetched ? 'done' : isPrefetching ? 'loading' : 'pending'}
    >
      {children}
    </div>
  );
}

/**
 * LazyModelGrid - Grid that progressively prefetches models as they become visible
 */
interface LazyModelGridProps {
  models: string[];
  allModels?: string[];
  renderModel: (model: string, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
}

export function LazyModelGrid({
  models,
  allModels = [],
  renderModel,
  className = '',
  itemClassName = ''
}: LazyModelGridProps) {
  const [prefetchedCount, setPrefetchedCount] = useState(0);

  const handlePrefetch = useCallback((model: string) => {
    setPrefetchedCount(prev => prev + 1);
  }, []);

  return (
    <div className={`grid gap-4 ${className}`}>
      {models.map((model, index) => (
        <IntersectionPrefetch
          key={model}
          model={model}
          allModels={allModels}
          className={itemClassName}
          onPrefetch={handlePrefetch}
          // Increase threshold for items further down to be more aggressive
          threshold={index < 6 ? 0.1 : 0.05}
          rootMargin={index < 6 ? '50px' : '100px'}
        >
          {renderModel(model, index)}
        </IntersectionPrefetch>
      ))}
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground mt-4">
          Prefetched: {prefetchedCount}/{models.length} models
        </div>
      )}
    </div>
  );
}

/**
 * PrefetchOnScroll - Prefetches next batch of models based on scroll position
 */
interface PrefetchOnScrollProps {
  models: string[];
  currentIndex: number;
  batchSize?: number;
  children: React.ReactNode;
}

export function PrefetchOnScroll({
  models,
  currentIndex,
  batchSize = 3,
  children
}: PrefetchOnScrollProps) {
  const [prefetchedIndices, setPrefetchedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prefetchNextBatch = () => {
      const startIndex = currentIndex + 1;
      const endIndex = Math.min(startIndex + batchSize, models.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        if (!prefetchedIndices.has(i)) {
          const model = models[i];
          prefetchModelData(model)
            .then(() => {
              setPrefetchedIndices(prev => new Set([...prev, i]));
              console.log(`🔄 Scroll prefetched: ${model}`);
            })
            .catch(error => {
              console.log(`Failed to scroll prefetch ${model}:`, error);
            });
        }
      }
    };

    prefetchNextBatch();
  }, [currentIndex, models, batchSize, prefetchedIndices]);

  return <>{children}</>;
}

/**
 * SmartPrefetchContainer - Combines multiple prefetching strategies
 */
interface SmartPrefetchContainerProps {
  models: string[];
  visibleModels: string[];
  currentModel?: string;
  children: React.ReactNode;
  prefetchStrategy?: 'hover' | 'intersection' | 'scroll' | 'all';
}

export function SmartPrefetchContainer({
  models,
  visibleModels,
  currentModel,
  children,
  prefetchStrategy = 'all'
}: SmartPrefetchContainerProps) {
  const [stats, setStats] = useState({
    hoverPrefetched: 0,
    intersectionPrefetched: 0,
    scrollPrefetched: 0
  });

  // Predictive prefetching based on current model
  useEffect(() => {
    if (currentModel && (prefetchStrategy === 'all' || prefetchStrategy === 'scroll')) {
      // Find similar models to prefetch
      const currentIndex = models.indexOf(currentModel);
      if (currentIndex >= 0) {
        const nearbyModels = models.slice(
          Math.max(0, currentIndex - 2),
          Math.min(models.length, currentIndex + 3)
        ).filter(m => m !== currentModel);

        nearbyModels.forEach(model => {
          setTimeout(() => {
            prefetchModelData(model)
              .then(() => {
                setStats(prev => ({ ...prev, scrollPrefetched: prev.scrollPrefetched + 1 }));
                console.log(`🎯 Predictively prefetched: ${model}`);
              })
              .catch(() => {
                // Silently fail for predictive prefetching
              });
          }, Math.random() * 1000); // Stagger requests
        });
      }
    }
  }, [currentModel, models, prefetchStrategy]);

  // Prefetch visible models that aren't already loaded
  useEffect(() => {
    if (prefetchStrategy === 'all' || prefetchStrategy === 'intersection') {
      visibleModels.forEach(model => {
        setTimeout(() => {
          prefetchModelData(model)
            .then(() => {
              setStats(prev => ({ ...prev, intersectionPrefetched: prev.intersectionPrefetched + 1 }));
            })
            .catch(() => {
              // Silently fail
            });
        }, 200);
      });
    }
  }, [visibleModels, prefetchStrategy]);

  return (
    <div data-prefetch-strategy={prefetchStrategy}>
      {children}
      
      {/* Debug stats */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-background border rounded p-2 text-xs">
          <div>Hover: {stats.hoverPrefetched}</div>
          <div>Intersection: {stats.intersectionPrefetched}</div>
          <div>Scroll: {stats.scrollPrefetched}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing intersection-based prefetching
 */
export function useIntersectionPrefetch(
  models: string[],
  options: {
    threshold?: number;
    rootMargin?: string;
    batchSize?: number;
  } = {}
) {
  const [visibleModels, setVisibleModels] = useState<string[]>([]);
  const [prefetchedModels, setPrefetchedModels] = useState<string[]>([]);

  const {
    threshold = 0.1,
    rootMargin = '50px',
    batchSize = 3
  } = options;

  const observeModel = useCallback((element: Element, model: string) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleModels(prev => {
              if (!prev.includes(model)) {
                return [...prev, model];
              }
              return prev;
            });
          } else {
            setVisibleModels(prev => prev.filter(m => m !== model));
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    // Prefetch visible models in batches
    const newlyVisible = visibleModels.filter(m => !prefetchedModels.includes(m));
    
    if (newlyVisible.length > 0) {
      const batch = newlyVisible.slice(0, batchSize);
      
      batch.forEach(model => {
        prefetchModelData(model)
          .then(() => {
            setPrefetchedModels(prev => [...prev, model]);
          })
          .catch(() => {
            // Ignore errors for background prefetching
          });
      });
    }
  }, [visibleModels, prefetchedModels, batchSize]);

  return {
    visibleModels,
    prefetchedModels,
    observeModel
  };
}