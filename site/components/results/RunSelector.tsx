/**
 * Accessible Run Selector Component
 * Allows users to select different benchmark runs with WCAG AAA compliance
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  Database, 
  Users, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RunsList } from '@/types/evaluation';

interface RunSelectorProps {
  runs: RunsList;
  selectedRun?: string;
  onRunSelect: (timestamp: string) => void;
  loading?: boolean;
  className?: string;
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return timestamp;
  }
}

function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays === 0 && diffHours === 0) {
      return 'Just now';
    } else if (diffDays === 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return formatTimestamp(timestamp).split(',')[0]; // Just the date part
    }
  } catch {
    return 'Unknown';
  }
}

export function RunSelector({ 
  runs, 
  selectedRun, 
  onRunSelect, 
  loading = false, 
  className = '' 
}: RunSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const selectedRunInfo = runs.runs.find(run => run.timestamp === selectedRun);
  const latestRun = runs.runs[0]; // Runs are sorted by timestamp desc
  
  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-muted animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!runs.runs.length) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="text-center py-8">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Runs Available</h3>
          <p className="text-sm text-muted-foreground">
            No benchmark runs found. Please check your data source.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Benchmark Run Selection
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose a benchmark run to analyze results
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Selection Display */}
        <div className="p-4 rounded-lg border-2 border-dashed border-border bg-muted/30">
          {selectedRunInfo ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-chart-1" />
                    Selected Run
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(selectedRunInfo.timestamp)}
                  </p>
                </div>
                <Badge variant="default" className="w-fit">
                  {formatRelativeTime(selectedRunInfo.timestamp)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-chart-1">
                    {selectedRunInfo.models.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Models</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-chart-2">
                    {selectedRunInfo.num_prompts}
                  </p>
                  <p className="text-xs text-muted-foreground">Prompts</p>
                </div>
              </div>
              
              {selectedRunInfo.models.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Models in this run:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRunInfo.models.slice(0, 3).map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                    {selectedRunInfo.models.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedRunInfo.models.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">No run selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a run from the list below to view results
              </p>
            </div>
          )}
        </div>
        
        {/* Latest Run Quick Select */}
        {latestRun && latestRun.timestamp !== selectedRun && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Latest Run
            </h4>
            <Button
              variant="outline"
              onClick={() => onRunSelect(latestRun.timestamp)}
              className="w-full justify-start p-4 h-auto min-h-[44px]"
              aria-label={`Select latest run from ${formatTimestamp(latestRun.timestamp)}`}
            >
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">
                    {formatTimestamp(latestRun.timestamp)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {formatRelativeTime(latestRun.timestamp)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {latestRun.models.length} models
                  </span>
                  <span>{latestRun.num_prompts} prompts</span>
                </div>
              </div>
            </Button>
          </div>
        )}
        
        {/* All Runs List */}
        {runs.runs.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                All Runs ({runs.runs.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-controls="runs-list"
                aria-label={isExpanded ? 'Hide all runs' : 'Show all runs'}
                className="h-8 px-2"
              >
                <span className="text-xs mr-1">
                  {isExpanded ? 'Hide' : 'Show'} All
                </span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  id="runs-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {runs.runs.map((run) => (
                      <Button
                        key={run.timestamp}
                        variant={run.timestamp === selectedRun ? 'default' : 'outline'}
                        onClick={() => onRunSelect(run.timestamp)}
                        className="w-full justify-start p-3 h-auto min-h-[44px]"
                        aria-label={`Select run from ${formatTimestamp(run.timestamp)}`}
                        aria-pressed={run.timestamp === selectedRun}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {formatTimestamp(run.timestamp)}
                            </span>
                            <div className="flex items-center gap-2">
                              {run.timestamp === selectedRun && (
                                <CheckCircle className="w-3 h-3 text-primary-foreground" />
                              )}
                              <Badge 
                                variant={run.timestamp === selectedRun ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {formatRelativeTime(run.timestamp)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs opacity-80">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {run.models.length}
                            </span>
                            <span>{run.num_prompts} prompts</span>
                            {run.uploaded_at && (
                              <span>
                                Uploaded: {formatRelativeTime(run.uploaded_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <Separator />
        
        {/* Summary Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total runs available: {runs.runs.length}</span>
          {runs.updated_at && (
            <span>
              Updated: {formatRelativeTime(runs.updated_at)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}