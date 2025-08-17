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

  // Generate monochromatic colors based on chart-1 variable
  const getProviderColors = () => {
    if (typeof window === 'undefined') {
      // Server-side fallback - use light mode chart-1 base color
      const baseColor = '#644a40'; // chart-1 light mode
      return {
        'Anthropic': baseColor,
        'OpenAI': lightenColor(baseColor, 0.3),
        'Google': darkenColor(baseColor, 0.2),
        'Unknown': lightenColor(baseColor, 0.5)
      };
    }
    
    const style = getComputedStyle(document.documentElement);
    const baseColor = style.getPropertyValue('--chart-1').trim();
    
    return {
      'Anthropic': baseColor, // Primary color
      'OpenAI': lightenColor(baseColor, 0.3), // Lighter variation
      'Google': darkenColor(baseColor, 0.2), // Darker variation  
      'Unknown': lightenColor(baseColor, 0.5) // Lightest variation
    };
  };

  // Helper function to lighten a color
  const lightenColor = (color: string, amount: number) => {
    if (color.startsWith('#')) {
      // Convert hex to RGB, lighten, and return hex
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
      const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
      const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
      
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    return color; // Return original if not hex
  };

  // Helper function to darken a color
  const darkenColor = (color: string, amount: number) => {
    if (color.startsWith('#')) {
      // Convert hex to RGB, darken, and return hex
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      const newR = Math.floor(r * (1 - amount));
      const newG = Math.floor(g * (1 - amount));
      const newB = Math.floor(b * (1 - amount));
      
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    return color; // Return original if not hex
  };

  return (
    <div className="h-[550px] p-4 relative">
      {/* Quadrant background labels */}
      <div className="absolute inset-4 pointer-events-none">
        <div className="absolute top-3 left-3 text-sm font-medium text-muted-foreground/60">Over-cautious</div>
        <div className="absolute top-3 right-3 text-sm font-medium text-muted-foreground/60">Ideal Zone</div>
        <div className="absolute bottom-3 left-3 text-sm font-medium text-muted-foreground/60">Poor Performance</div>
        <div className="absolute bottom-3 right-3 text-sm font-medium text-muted-foreground/60">Risky but Helpful</div>
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
          
          // Scale to 40-80px range for much better visibility
          return 40 + (normalizedSize * 40);
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
        
        // Interactivity - remove useMesh to fix tooltip positioning
        isInteractive={true}
        useMesh={false}
        debugMesh={false}
        tooltip={({ node }) => {
          const data = node.data as any;
          return (
            <div 
              style={{
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                maxWidth: '300px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>{data.modelName}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                <div style={{ marginBottom: '4px', whiteSpace: 'nowrap' }}>Safety: {(data.x * 100).toFixed(1)}%</div>
                <div style={{ marginBottom: '4px', whiteSpace: 'nowrap' }}>Helpfulness: {(data.y * 100).toFixed(1)}%</div>
                <div style={{ marginBottom: '4px', whiteSpace: 'nowrap' }}>Effectiveness: {((data.x * data.y) * 100).toFixed(1)}%</div>
                <div style={{ marginBottom: '4px', whiteSpace: 'nowrap' }}>Evaluations: {data.evaluations}</div>
                {data.tokens > 0 && <div style={{ whiteSpace: 'nowrap' }}>Tokens: {data.tokens.toLocaleString()}</div>}
              </div>
            </div>
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
  );
}