/**
 * ScatterPlotTooltip Component - Clean tooltip for scatter plot with provider icons
 */

'use client';

import React from 'react';
import { ProviderLogo } from '@/components/ui/provider-logo';
import { cn } from '@/lib/utils';

interface ScatterPlotTooltipProps {
  data: {
    modelName: string;
    x: number; // Safety score
    y: number; // Helpfulness score
    evaluations: number;
    tokens: number;
  };
  provider: string;
  isGroupedByProvider?: boolean;
  className?: string;
}

export function ScatterPlotTooltip({ 
  data, 
  provider, 
  isGroupedByProvider = false,
  className 
}: ScatterPlotTooltipProps) {
  const effectiveness = data.x * data.y;

  // Check if modelName already contains provider info (when grouped by provider)
  const showProviderHeader = !isGroupedByProvider && !data.modelName.includes(provider);

  // Color coding functions from TableView
  const getScoreColorClass = (score: number, thresholds: { high: number; medium: number }) => {
    if (score >= thresholds.high) return 'text-chart-1 font-semibold'; // Good performance
    if (score >= thresholds.medium) return 'text-foreground font-medium'; // Moderate performance
    return 'text-destructive font-semibold'; // Poor performance
  };

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;

  return (
    <div 
      data-slot="scatter-tooltip"
      className={cn(
        "bg-background text-foreground border border-border rounded-lg p-3 shadow-lg min-w-[300px] max-w-[320px]",
        "text-sm leading-relaxed",
        className
      )}
    >
      {/* Provider Header - only show when not redundant */}
      {showProviderHeader && (
        <div 
          data-slot="scatter-tooltip-provider"
          className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50"
        >
          <ProviderLogo provider={provider} size={16} />
          <span className="text-xs font-medium text-muted-foreground">
            {provider}
          </span>
        </div>
      )}

      {/* Model Name */}
      <div 
        data-slot="scatter-tooltip-model"
        className={cn(
          "font-medium text-foreground leading-tight",
          showProviderHeader ? "mb-3" : "mb-3 flex items-center gap-2"
        )}
      >
        {/* Show provider icon inline when no provider header */}
        {!showProviderHeader && (
          <ProviderLogo provider={provider} size={16} />
        )}
        {data.modelName}
      </div>

      {/* Metrics Grid */}
      <div 
        data-slot="scatter-tooltip-metrics"
        className="space-y-2.5 text-sm"
      >
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground min-w-[90px]">Safety:</span>
          <span className={cn("font-mono", getScoreColorClass(data.x, { high: 0.7, medium: 0.5 }))}>
            {formatScore(data.x)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground min-w-[90px]">Helpfulness:</span>
          <span className={cn("font-mono", getScoreColorClass(data.y, { high: 0.7, medium: 0.5 }))}>
            {formatScore(data.y)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground min-w-[90px]">Effectiveness:</span>
          <span className={cn("font-mono font-bold", getScoreColorClass(effectiveness, { high: 0.5, medium: 0.3 }))}>
            {formatScore(effectiveness)}
          </span>
        </div>
        
        <div className="pt-2 mt-3 border-t border-border/30 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground min-w-[90px]">Evaluations:</span>
            <span className="font-mono text-foreground">
              {data.evaluations.toLocaleString()}
            </span>
          </div>
          
          {data.tokens > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground min-w-[90px]">Tokens:</span>
              <span className="font-mono text-foreground">
                {data.tokens.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
