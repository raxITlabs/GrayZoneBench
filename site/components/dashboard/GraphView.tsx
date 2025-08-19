/**
 * GraphView Component - Safety vs Helpfulness scatter plot analysis
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import { 
  prepareScatterData, 
  prepareProviderScatterData, 
  getUniqueProvidersFromModelData,
  getDynamicProviderColors 
} from '@/libs/data-transforms';
import { GraphLegend } from './GraphLegend';
import { ScatterPlotTooltip } from './ScatterPlotTooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/use-theme';

interface GraphViewProps {
  metadata: BenchmarkMetadata | null;
  modelData: Record<string, ModelData>;
  groupByProvider: boolean;
  selectedProviders: string[];
}

export function GraphView({
  metadata,
  modelData,
  groupByProvider,
  selectedProviders
}: GraphViewProps) {
  const isMobile = useIsMobile(768);
  const { resolvedTheme } = useTheme();

  // Dynamic color system based on actual providers in the data
  // Now reactive to theme changes - will update when user switches light/dark mode
  const providerColorMap = useMemo(() => {
    if (!modelData || Object.keys(modelData).length === 0) {
      return {};
    }
    
    // Get unique providers from the actual model data
    const uniqueProviders = getUniqueProvidersFromModelData(modelData);
    
    // Filter by selected providers if any
    const filteredProviders = selectedProviders.length > 0 
      ? uniqueProviders.filter(provider => selectedProviders.includes(provider))
      : uniqueProviders;
    
    // Generate dynamic color mapping using CSS chart variables
    // This will re-run when resolvedTheme changes (light/dark mode switch)
    return getDynamicProviderColors(filteredProviders);
  }, [modelData, selectedProviders, resolvedTheme]);

  // Get color for a specific provider
  const getProviderColor = useCallback((provider: string): string => {
    return providerColorMap[provider] || '#888888'; // Fallback gray
  }, [providerColorMap]);
  
  // Prepare scatter plot data with dynamic colors
  const scatterData = useMemo(() => {
    if (!metadata || Object.keys(modelData).length === 0) return [];
    
    // Choose data based on grouping preference
    const data = groupByProvider 
      ? prepareProviderScatterData(modelData, selectedProviders)
      : prepareScatterData(modelData, selectedProviders);
    
    // Group by provider for Nivo scatter plot format and assign dynamic colors
    const groupedData = data.reduce((acc, point) => {
      const existing = acc.find(group => group.id === point.provider);
      const providerColor = getProviderColor(point.provider);
      
      if (existing) {
        existing.data.push({
          x: point.x,
          y: point.y,
          size: point.size,
          modelName: point.modelName,
          evaluations: point.evaluations,
          tokens: point.tokens
        });
      } else {
        acc.push({
          id: point.provider,
          color: providerColor,
          data: [{
            x: point.x,
            y: point.y,
            size: point.size,
            modelName: point.modelName,
            evaluations: point.evaluations,
            tokens: point.tokens
          }]
        });
      }
      return acc;
    }, [] as any[]);
    
    return groupedData;
  }, [metadata, modelData, groupByProvider, selectedProviders, getProviderColor]);

  if (scatterData.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-muted-foreground">
        <p>No data available for selected providers</p>
      </div>
    );
  }



  // Prepare legend data
  const legendData = useMemo(() => {
    return scatterData.map(serie => ({
      id: serie.id as string,
      color: serie.color as string,
      dataCount: serie.data.length
    }));
  }, [scatterData]);

  return (
    <div className="h-[400px] md:h-[550px] p-2 md:p-4 relative flex">
      {/* Main chart area */}
      <div className="flex-1 relative">
        {/* Quadrant background labels - hidden on mobile */}
        {!isMobile && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1 left-3 text-sm font-medium text-muted-foreground/60">Over-cautious</div>
            <div className="absolute top-1 right-3 text-sm font-medium text-muted-foreground/60">Ideal Zone</div>
            <div className="absolute bottom-3 left-3 text-sm font-medium text-muted-foreground/60">Poor Performance</div>
            <div className="absolute bottom-3 right-3 text-sm font-medium text-muted-foreground/60">Risky but Helpful</div>
          </div>
        )}
      
        <ResponsiveScatterPlot
          data={scatterData}
          margin={isMobile 
            ? { top: 40, right: 20, bottom: 60, left: 60 }
            : { top: 60, right: 20, bottom: 70, left: 70 }}
        xScale={{ type: 'linear', min: 0, max: 1 }}
        yScale={{ type: 'linear', min: 0, max: 1 }}
        blendMode="normal"
        
        // Point styling - optimized size for better readability
        nodeSize={(node) => {
          // Normalize size within current dataset for better scaling
          const allSizes = scatterData.flatMap(serie => serie.data.map((d: any) => d.size));
          const minSize = Math.min(...allSizes);
          const maxSize = Math.max(...allSizes);
          const normalizedSize = maxSize > minSize 
            ? ((node.data as any).size - minSize) / (maxSize - minSize)
            : 0.5; // If all sizes are the same, use medium size
          
          // Scale to 20-40px range for better density and readability
          return 20 + (normalizedSize * 20);
        }}
        colors={({ serieId }) => getProviderColor(serieId as string)}
        
        // Axes
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Safety Score',
          legendPosition: 'middle',
          legendOffset: 46,
          format: (value) => `${(value * 100).toFixed(0)}%`,
          tickValues: [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Helpfulness Score',
          legendPosition: 'middle',
          legendOffset: -50,
          format: (value) => `${(value * 100).toFixed(0)}%`,
          tickValues: [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        }}
        
        // Grid
        enableGridX={true}
        enableGridY={true}
        gridXValues={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
        gridYValues={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
        
        // Disable built-in legend - using custom legend
        legends={[]}
        
        // Interactivity - remove useMesh to fix tooltip positioning
        isInteractive={true}
        useMesh={false}
        debugMesh={false}
        tooltip={({ node }) => {
          const data = node.data as any;
          const provider = node.serieId as string;
          
          return (
            <ScatterPlotTooltip
              data={{
                modelName: data.modelName,
                x: data.x,
                y: data.y,
                evaluations: data.evaluations,
                tokens: data.tokens
              }}
              provider={provider}
              isGroupedByProvider={groupByProvider}
            />
          );
        }}
        
        // Theme
        theme={{
          background: 'transparent',
          text: {
            fontSize: 14,
            fill: 'var(--foreground)',
            outlineWidth: 0,
            outlineColor: 'transparent'
          },
          axis: {
            domain: {
              line: {
                stroke: 'var(--border)',
                strokeWidth: 1
              }
            },
            ticks: {
              line: {
                stroke: 'var(--border)',
                strokeWidth: 1
              },
              text: {
                fontSize: 13,
                fill: 'var(--foreground)'
              }
            },
            legend: {
              text: {
                fontSize: 14,
                fill: 'var(--foreground)',
                fontWeight: 500
              }
            }
          },
          grid: {
            line: {
              stroke: 'var(--border)',
              strokeWidth: 1,
              strokeOpacity: 0.2,
              strokeDasharray: '2 2'
            }
          },
          legends: {
            text: {
              fontSize: 13,
              fill: 'var(--foreground)'
            }
          },
          tooltip: {
            container: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: 14,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '12px',
              border: '1px solid var(--border)'
            }
          }
        }}
        />
      </div>
      
      {/* Custom Legend - only on desktop */}
      {!isMobile && (
        <div className="w-36 ml-4 flex-shrink-0">
          <GraphLegend items={legendData} />
        </div>
      )}
    </div>
  );
}