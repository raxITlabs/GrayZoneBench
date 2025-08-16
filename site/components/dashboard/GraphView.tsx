/**
 * GraphView Component - Safety vs Helpfulness scatter plot analysis
 */

'use client';

import React, { useMemo } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import { prepareScatterData, prepareProviderScatterData } from '@/libs/data-transforms';

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
  
  // Prepare scatter plot data
  const scatterData = useMemo(() => {
    if (!metadata || Object.keys(modelData).length === 0) return [];
    
    // Choose data based on grouping preference
    const data = groupByProvider 
      ? prepareProviderScatterData(modelData, selectedProviders)
      : prepareScatterData(modelData, selectedProviders);
    
    // Group by provider for Nivo scatter plot format
    const groupedData = data.reduce((acc, point) => {
      const existing = acc.find(group => group.id === point.provider);
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
          color: point.color,
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
  }, [metadata, modelData, groupByProvider, selectedProviders]);

  if (scatterData.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-muted-foreground">
        <p>No data available for selected providers</p>
      </div>
    );
  }

  // Get provider colors from CSS custom properties
  const getProviderColors = () => {
    if (typeof window === 'undefined') {
      return {
        'OpenAI': '#ffdfb5',
        'Anthropic': '#644a40', 
        'Google': '#e8e8e8',
        'Unknown': '#888888'
      };
    }
    
    const style = getComputedStyle(document.documentElement);
    return {
      'OpenAI': style.getPropertyValue('--chart-2').trim(),
      'Anthropic': style.getPropertyValue('--chart-1').trim(),
      'Google': style.getPropertyValue('--chart-3').trim(),
      'Unknown': style.getPropertyValue('--muted').trim()
    };
  };

  return (
    <div className="h-[500px] p-4 relative">
      {/* Quadrant background labels */}
      <div className="absolute inset-4 pointer-events-none">
        <div className="absolute top-2 left-2 text-xs text-muted-foreground/50">Over-cautious</div>
        <div className="absolute top-2 right-2 text-xs text-muted-foreground/50">Ideal Zone</div>
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground/50">Poor Performance</div>
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50">Risky but Helpful</div>
      </div>
      
      <ResponsiveScatterPlot
        data={scatterData}
        margin={{ top: 60, right: 140, bottom: 70, left: 70 }}
        xScale={{ type: 'linear', min: 0, max: 1 }}
        yScale={{ type: 'linear', min: 0, max: 1 }}
        blendMode="normal"
        
        // Point styling - much larger for visibility
        nodeSize={(node) => {
          // Normalize size within current dataset for better scaling
          const allSizes = scatterData.flatMap(serie => serie.data.map((d: any) => d.size));
          const minSize = Math.min(...allSizes);
          const maxSize = Math.max(...allSizes);
          const normalizedSize = maxSize > minSize 
            ? ((node.data as any).size - minSize) / (maxSize - minSize)
            : 0.5; // If all sizes are the same, use medium size
          
          // Scale to 20-50px range for much better visibility
          return 20 + (normalizedSize * 30);
        }}
        colors={({ serieId }) => getProviderColors()[serieId as keyof ReturnType<typeof getProviderColors>] || '#888888'}
        
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
        
        // Legend
        legends={[
          {
            anchor: 'right',
            direction: 'column',
            justify: false,
            translateX: 130,
            translateY: 0,
            itemWidth: 100,
            itemHeight: 20,
            itemsSpacing: 5,
            itemDirection: 'left-to-right',
            symbolSize: 12,
            symbolShape: 'circle'
          }
        ]}
        
        // Interactivity
        isInteractive={true}
        useMesh={true}
        debugMesh={false}
        tooltip={({ node }) => {
          const data = node.data as any;
          return (
            <div className="bg-popover px-3 py-2 rounded shadow-lg border text-sm max-w-xs">
              <div className="font-medium">{data.modelName}</div>
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <div>Safety: {(data.x * 100).toFixed(1)}%</div>
                <div>Helpfulness: {(data.y * 100).toFixed(1)}%</div>
                <div>Effectiveness: {((data.x * data.y) * 100).toFixed(1)}%</div>
                <div>Evaluations: {data.evaluations}</div>
                {data.tokens > 0 && <div>Tokens: {data.tokens.toLocaleString()}</div>}
              </div>
            </div>
          );
        }}
        
        // Theme
        theme={{
          background: 'transparent',
          text: {
            fontSize: 12,
            fill: 'hsl(var(--foreground))',
            outlineWidth: 0,
            outlineColor: 'transparent'
          },
          axis: {
            domain: {
              line: {
                stroke: 'hsl(var(--border))',
                strokeWidth: 1
              }
            },
            ticks: {
              line: {
                stroke: 'hsl(var(--border))',
                strokeWidth: 1
              },
              text: {
                fontSize: 11,
                fill: 'hsl(var(--muted-foreground))'
              }
            },
            legend: {
              text: {
                fontSize: 12,
                fill: 'hsl(var(--foreground))',
                fontWeight: 500
              }
            }
          },
          grid: {
            line: {
              stroke: 'hsl(var(--border))',
              strokeWidth: 1,
              strokeOpacity: 0.2,
              strokeDasharray: '2 2'
            }
          },
          legends: {
            text: {
              fontSize: 11,
              fill: 'hsl(var(--foreground))'
            }
          },
          tooltip: {
            container: {
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              padding: '8px 12px'
            }
          }
        }}
      />
    </div>
  );
}