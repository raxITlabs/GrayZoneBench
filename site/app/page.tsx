/**
 * Enhanced GrayZoneBench Results Dashboard
 * Professional interface with three-tier evaluation visualization
 * WCAG AAA compliant with mobile-first responsive design
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedStatsCards } from '@/components/results/EnhancedStatsCards';
import { PrefetchButton } from '@/components/prefetch/HoverPrefetchLink';
import { SmartPrefetchContainer } from '@/components/prefetch/IntersectionPrefetch';
import { PerformanceProvider } from '@/components/prefetch/ResourceHints';
import { Shield, Database, AlertCircle, Loader2, BarChart3, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { 
  ModelStats,
  LoadingState,
  ErrorState,
  BenchmarkMetadata,
  SmartMergeResult
} from '@/types/evaluation';
import { 
  getModelStatsFromMetadata
} from '@/lib/fetch-utils';

// Loading skeleton components
function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}

// Main Results Page Component
function ResultsPageContent() {
  const [metadata, setMetadata] = useState<BenchmarkMetadata | null>(null);
  const [selectedResults, setSelectedResults] = useState<SmartMergeResult[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<SmartMergeResult>();
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  
  const [loading, setLoading] = useState<LoadingState>({
    runs: false,
    results: true,
    details: false
  });
  
  const [error, setError] = useState<ErrorState>({});

  // Fetch metadata first (lightweight load)
  useEffect(() => {
    async function loadMetadata() {
      try {
        setLoading(prev => ({ ...prev, results: true }));
        setError(prev => ({ ...prev, results: undefined }));
        
        console.log('Frontend: Loading metadata via API...');
        
        // Fetch lightweight metadata first (~5KB) via API
        const response = await fetch('/api/metadata');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const meta = await response.json();
        console.log('Frontend: Metadata loaded:', meta);
        setMetadata(meta);
        
        if (meta) {
          // Calculate model statistics from metadata (instant)
          const stats = getModelStatsFromMetadata(meta);
          setModelStats(stats);
          
          // Auto-select first few models for initial display
          const initialModels = meta.models_tested.slice(0, 3);
          setSelectedModels(initialModels);
        }
        
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        setError(prev => ({ ...prev, results: 'Failed to load metadata from GCS' }));
        setMetadata(null);
        setModelStats([]);
      } finally {
        setLoading(prev => ({ ...prev, results: false }));
      }
    }

    loadMetadata();
  }, []);

  // Load specific model data when needed
  const loadModelData = async (model: string) => {
    try {
      setLoading(prev => ({ ...prev, details: true }));
      
      console.log(`Frontend: Loading model data for ${model} via API...`);
      
      const response = await fetch(`/api/model?model=${encodeURIComponent(model)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const modelData = await response.json();
      console.log(`Frontend: Model data loaded for ${model}:`, Object.keys(modelData.results).length, 'results');
      
      if (modelData) {
        const newResults = Object.values(modelData.results) as SmartMergeResult[];
        setSelectedResults(prev => {
          // Merge with existing results, avoiding duplicates
          const existing = prev.filter(r => r.model !== model);
          return [...existing, ...newResults];
        });
      }
    } catch (err) {
      console.error(`Failed to load model data for ${model}:`, err);
      setError(prev => ({ ...prev, details: `Failed to load ${model} data` }));
    } finally {
      setLoading(prev => ({ ...prev, details: false }));
    }
  };

  // Load selected models data when selection changes
  useEffect(() => {
    if (selectedModels.length > 0 && metadata) {
      selectedModels.forEach(model => {
        loadModelData(model);
      });
    }
  }, [selectedModels, metadata]);

  const handleResultSelect = (result: SmartMergeResult) => {
    setSelectedResult(result);
  };

  // Error state
  if (error.results && !metadata) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.results || 'Failed to connect to Google Cloud Storage. Please check your configuration.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b pb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-4 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">GrayZoneBench Results</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Three-Tier AI Safety Evaluation Dashboard
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-chart-1 border-chart-1/20">
            <Database className="w-3 h-3 mr-1" />
            Latest Results
          </Badge>
          {metadata && (
            <>
              <Badge variant="outline">
                <Shield className="w-3 h-3 mr-1" />
                {metadata.models_tested.length} Models
              </Badge>
              <Badge variant="outline">
                <BarChart3 className="w-3 h-3 mr-1" />
                {metadata.total_prompts} Prompts
              </Badge>
              <Badge variant="outline">
                Last updated: {new Date(metadata.last_updated).toLocaleDateString()}
              </Badge>
            </>
          )}
        </div>
      </motion.div>

      {/* Model Selection with Prefetching */}
      {metadata && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Model Selection
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select models to analyze. Data prefetches on hover for instant loading.
                  </p>
                </div>
                <Badge variant="outline">
                  {selectedModels.length} of {metadata.models_tested.length} selected
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {metadata.models_tested.map((model) => (
                  <PrefetchButton
                    key={model}
                    model={model}
                    allModels={metadata.models_tested}
                    selected={selectedModels.includes(model)}
                    onClick={() => {
                      setSelectedModels(prev => 
                        prev.includes(model)
                          ? prev.filter(m => m !== model)
                          : [...prev, model]
                      );
                    }}
                  >
                    {model}
                  </PrefetchButton>
                ))}
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedModels(metadata.models_tested)}
                  className="text-xs px-3 py-1 bg-secondary rounded-md hover:bg-secondary/80"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedModels([])}
                  className="text-xs px-3 py-1 bg-secondary rounded-md hover:bg-secondary/80"
                >
                  Clear All
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <SmartPrefetchContainer
        models={metadata?.models_tested || []}
        visibleModels={selectedModels}
        currentModel={selectedResult?.model}
      >
        <div className="grid grid-cols-1 gap-6">
          {/* Enhanced Statistics */}
          {!loading.results && selectedResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <EnhancedStatsCards
                modelStats={modelStats}
                results={selectedResults.map(r => ({
                  model: r.model,
                  rowId: r.hf_index.toString(),
                  prompt: '',
                  response: {} as any,
                  judge: {} as any,
                  summary: '',
                  category: r.category,
                  timestamp: r.timestamp,
                  status: r.status === 'api_blocked' ? 'error' : r.status
                }))}
              />
            </motion.div>
          )}
        </div>
      </SmartPrefetchContainer>

      {/* Results Error State */}
      {error.results && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.results}</AlertDescription>
        </Alert>
      )}

      {/* Results Loading State */}
      {loading.results && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-chart-1 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading Results</h3>
              <p className="text-sm text-muted-foreground">
                Fetching detailed evaluation data...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Results Grid */}
      <AnimatePresence>
        {!loading.results && selectedResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Individual Model Results</h2>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {selectedResults.length} evaluations
                </Badge>
                <Badge variant="outline">
                  {new Set(selectedResults.map(r => r.model)).size} models
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedResults.map((result, index) => (
                <motion.div
                  key={`${result.model}-${result.hf_index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => handleResultSelect(result)}
                  >
                    <Card className={`hover:shadow-md transition-shadow ${
                      selectedResult?.model === result.model && selectedResult?.hf_index === result.hf_index
                        ? 'ring-2 ring-chart-1' 
                        : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-sm">{result.model}</h3>
                              <p className="text-xs text-muted-foreground">
                                Prompt #{result.hf_index} • {result.category}
                              </p>
                            </div>
                            <Badge variant={result.safety === 'SAFE' ? 'default' : 'destructive'}>
                              {result.safety}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Safety:</span>
                              <div className="font-mono">{(result.detailed_safety_score || 0).toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Helpfulness:</span>
                              <div className="font-mono">{(result.detailed_helpfulness_score || 0).toFixed(2)}</div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Tokens: {result.input_tokens + result.output_tokens}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading.results && selectedResults.length === 0 && metadata && (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-sm text-muted-foreground">
              No evaluation results found in the latest results. 
              Please check if the benchmark has been run recently.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main exported component with error boundary and performance optimizations
export default function ResultsPage() {
  return (
    <PerformanceProvider enableMetrics={true}>
      <Suspense fallback={<PageSkeleton />}>
        <ResultsPageContent />
      </Suspense>
    </PerformanceProvider>
  );
}