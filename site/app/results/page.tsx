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
import { AccessiblePipeline } from '@/components/evaluation-pipeline/AccessiblePipeline';
import { ResponsiveResultCard } from '@/components/results/ResponsiveResultCard';
import { RunSelector } from '@/components/results/RunSelector';
import { EnhancedStatsCards } from '@/components/results/EnhancedStatsCards';
import { Shield, Database, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { 
  CompleteModelResult, 
  RunsList, 
  RunInfo, 
  ModelStats,
  LoadingState,
  ErrorState 
} from '@/types/evaluation';
import { 
  fetchRunsList, 
  fetchCompleteRunResults, 
  calculateModelStats 
} from '@/lib/fetch-results';

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
  const [runsList, setRunsList] = useState<RunsList>({ runs: [], total: 0, updated_at: '' });
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [results, setResults] = useState<CompleteModelResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CompleteModelResult>();
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [currentRunInfo, setCurrentRunInfo] = useState<RunInfo>();
  
  const [loading, setLoading] = useState<LoadingState>({
    runs: true,
    results: false,
    details: false
  });
  
  const [error, setError] = useState<ErrorState>({});

  // Fetch runs list on mount
  useEffect(() => {
    async function loadRuns() {
      try {
        setLoading(prev => ({ ...prev, runs: true }));
        const runs = await fetchRunsList();
        setRunsList(runs);
        
        // Auto-select the latest run if available
        if (runs.runs.length > 0 && !selectedRun) {
          setSelectedRun(runs.runs[0].timestamp);
        }
      } catch (err) {
        console.error('Failed to fetch runs:', err);
        setError(prev => ({ ...prev, runs: 'Failed to load benchmark runs' }));
      } finally {
        setLoading(prev => ({ ...prev, runs: false }));
      }
    }

    loadRuns();
  }, [selectedRun]);

  // Fetch results when run selection changes
  useEffect(() => {
    async function loadResults() {
      if (!selectedRun) return;

      try {
        setLoading(prev => ({ ...prev, results: true }));
        setError(prev => ({ ...prev, results: undefined }));
        
        const runResults = await fetchCompleteRunResults(selectedRun);
        setResults(runResults);
        
        // Calculate model statistics
        const stats = await calculateModelStats(runResults);
        setModelStats(stats);
        
        // Set run info
        const runInfo = runsList.runs.find(run => run.timestamp === selectedRun);
        setCurrentRunInfo(runInfo);
        
        // Clear previous selection
        setSelectedResult(undefined);
        
      } catch (err) {
        console.error('Failed to fetch results:', err);
        setError(prev => ({ ...prev, results: 'Failed to load results for selected run' }));
        setResults([]);
        setModelStats([]);
      } finally {
        setLoading(prev => ({ ...prev, results: false }));
      }
    }

    loadResults();
  }, [selectedRun, runsList.runs]);

  const handleRunSelect = (timestamp: string) => {
    setSelectedRun(timestamp);
  };

  const handleResultSelect = (result: CompleteModelResult) => {
    setSelectedResult(result);
  };

  // Error state
  if (error.runs && runsList.runs.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.runs || 'Failed to connect to Google Cloud Storage. Please check your configuration.'}
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
            Connected to GCS
          </Badge>
          {currentRunInfo && (
            <>
              <Badge variant="outline">
                <Shield className="w-3 h-3 mr-1" />
                {currentRunInfo.models.length} Models
              </Badge>
              <Badge variant="outline">
                <BarChart3 className="w-3 h-3 mr-1" />
                {results.length} Results
              </Badge>
            </>
          )}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Run Selection and Pipeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Three-Tier Pipeline Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AccessiblePipeline 
              selectedResult={selectedResult}
            />
          </motion.div>
          
          {/* Enhanced Statistics */}
          {!loading.results && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <EnhancedStatsCards
                modelStats={modelStats}
                runInfo={currentRunInfo}
                results={results}
              />
            </motion.div>
          )}
        </div>

        {/* Right Column - Run Selector */}
        <div className="lg:col-span-4">
          <div className="sticky top-4 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <RunSelector
                runs={runsList}
                selectedRun={selectedRun}
                onRunSelect={handleRunSelect}
                loading={loading.runs}
              />
            </motion.div>
          </div>
        </div>
      </div>

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
        {!loading.results && results.length > 0 && (
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
                  {results.length} evaluations
                </Badge>
                <Badge variant="outline">
                  {new Set(results.map(r => r.model)).size} models
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <motion.div
                  key={`${result.model}-${result.rowId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <ResponsiveResultCard
                    result={result}
                    onSelect={handleResultSelect}
                    isSelected={selectedResult?.model === result.model && selectedResult?.rowId === result.rowId}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading.results && results.length === 0 && selectedRun && (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-sm text-muted-foreground">
              No evaluation results found for the selected run. 
              Please try selecting a different run or check your data source.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main exported component with error boundary
export default function ResultsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResultsPageContent />
    </Suspense>
  );
}