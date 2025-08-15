/**
 * Resource Hints and Performance Optimization Components
 * Adds DNS prefetch, preconnect, and other performance hints for optimal loading
 */

'use client';

import React, { useEffect } from 'react';

interface ResourceHintsProps {
  gcsEndpoint?: string;
  additionalDomains?: string[];
}

/**
 * ResourceHints - Adds performance-oriented resource hints to the document head
 */
export function ResourceHints({ 
  gcsEndpoint = 'storage.googleapis.com',
  additionalDomains = []
}: ResourceHintsProps) {
  useEffect(() => {
    // Add resource hints dynamically
    const addResourceHint = (rel: string, href: string, as?: string) => {
      const existing = document.querySelector(`link[rel="${rel}"][href="${href}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (as) link.setAttribute('as', 'fetch');
      if (rel === 'prefetch' || rel === 'preload') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    };

    // DNS prefetch for external domains (only if actually needed)
    additionalDomains.forEach(domain => {
      addResourceHint('dns-prefetch', `https://${domain}`);
    });

    // Prefetch critical API endpoints (local API routes)
    addResourceHint('prefetch', '/api/metadata', 'fetch');
    
    // Note: No GCS prefetch needed - we use local API endpoints
    // Direct GCS access causes CORS errors in browser

    return () => {
      // Cleanup is handled by the browser, but we could remove hints here if needed
    };
  }, [additionalDomains]);

  return null; // This component doesn't render anything
}

/**
 * PerformanceMonitor - Monitors and logs performance metrics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Monitor navigation timing
    const navObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('🚀 Navigation Performance:', {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            firstByte: entry.responseStart - entry.requestStart,
            domInteractive: entry.domInteractive - entry.navigationStart
          });
        }
      });
    });

    // Monitor resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name.includes('googleapis.com') || entry.name.includes('metadata.json')) {
          console.log('📡 GCS Resource Performance:', {
            name: entry.name,
            duration: entry.duration,
            transferSize: (entry as any).transferSize || 0,
            decodedBodySize: (entry as any).decodedBodySize || 0
          });
        }
      });
    });

    // Monitor paint timing
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`🎨 ${entry.name}:`, entry.startTime);
      });
    });

    try {
      navObserver.observe({ entryTypes: ['navigation'] });
      resourceObserver.observe({ entryTypes: ['resource'] });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.log('Performance observation not supported:', error);
    }

    return () => {
      navObserver.disconnect();
      resourceObserver.disconnect();
      paintObserver.disconnect();
    };
  }, []);

  return null;
}

/**
 * LazyLoadingManager - Manages image and component lazy loading
 */
export function LazyLoadingManager() {
  useEffect(() => {
    // Enable native lazy loading for images
    const images = document.querySelectorAll('img[data-lazy]');
    images.forEach((img) => {
      img.setAttribute('loading', 'lazy');
      img.removeAttribute('data-lazy');
    });

    // Intersection observer for custom lazy loading
    const lazyElements = document.querySelectorAll('[data-lazy-load]');
    if (lazyElements.length === 0) return;

    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          element.classList.add('lazy-loaded');
          element.removeAttribute('data-lazy-load');
          lazyObserver.unobserve(element);
        }
      });
    }, {
      rootMargin: '100px'
    });

    lazyElements.forEach(el => lazyObserver.observe(el));

    return () => lazyObserver.disconnect();
  }, []);

  return null;
}

/**
 * ServiceWorkerRegistration - Registers service worker for caching
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ SW registered:', registration);
        })
        .catch((error) => {
          console.log('❌ SW registration failed:', error);
        });
    }
  }, []);

  return null;
}

/**
 * MetricsCollector - Collects and reports custom performance metrics
 */
interface MetricsCollectorProps {
  endpoint?: string;
  enabled?: boolean;
}

export function MetricsCollector({ 
  endpoint = '/api/metrics',
  enabled = process.env.NODE_ENV === 'production'
}: MetricsCollectorProps) {
  useEffect(() => {
    if (!enabled) return;

    const collectMetrics = () => {
      const metrics = {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : null,
        performance: {
          navigation: performance.getEntriesByType('navigation')[0],
          paint: performance.getEntriesByType('paint'),
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null
        }
      };

      // Send metrics (non-blocking)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, JSON.stringify(metrics));
      } else {
        fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(metrics),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true
        }).catch(() => {
          // Silently fail - metrics collection shouldn't break the app
        });
      }
    };

    // Collect metrics on page load and before unload
    const timer = setTimeout(collectMetrics, 5000); // Delay to capture accurate metrics
    
    const handleBeforeUnload = () => collectMetrics();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [endpoint, enabled]);

  return null;
}

/**
 * CacheManager - Manages browser caching strategies
 */
export function CacheManager() {
  useEffect(() => {
    // Prefetch critical resources
    const prefetchResources = [
      '/favicon.ico'  // Correct favicon path
      // Note: Font prefetching removed - Geist fonts are loaded via Next.js font optimization
    ];

    prefetchResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });

    // Cache API responses with proper headers
    if ('caches' in window) {
      const CACHE_NAME = 'grayzonebench-v1';
      
      // Cache the metadata endpoint
      caches.open(CACHE_NAME).then(cache => {
        cache.add('/api/metadata').catch(() => {
          // Silently fail - caching is optional
        });
      });
    }
  }, []);

  return null;
}

/**
 * Combined PerformanceProvider - Wraps all performance optimizations
 */
interface PerformanceProviderProps {
  children: React.ReactNode;
  enableMetrics?: boolean;
  gcsEndpoint?: string;
}

export function PerformanceProvider({
  children,
  enableMetrics = true,
  gcsEndpoint = 'storage.googleapis.com'
}: PerformanceProviderProps) {
  return (
    <>
      <ResourceHints gcsEndpoint={gcsEndpoint} />
      <PerformanceMonitor />
      <LazyLoadingManager />
      <ServiceWorkerRegistration />
      {enableMetrics && <MetricsCollector />}
      <CacheManager />
      {children}
    </>
  );
}

// CSS for lazy loading animations (to be added to globals.css)
export const lazyLoadingCSS = `
  [data-lazy-load] {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  [data-lazy-load].lazy-loaded {
    opacity: 1;
    transform: translateY(0);
  }

  /* Preload critical fonts */
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/inter-var.woff2') format('woff2');
  }

  /* Critical CSS for above-the-fold content */
  .results-header {
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Optimize chart rendering */
  .recharts-wrapper {
    contain: layout style paint;
  }

  /* Improve scroll performance */
  .results-grid {
    contain: layout;
    transform: translateZ(0);
  }
`;