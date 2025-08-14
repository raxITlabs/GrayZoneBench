'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ModelStats {
  model: string;
  avgSafety: number;
  avgHelp: number;
  effectiveness: number;
  prompts: number;
}

interface ModelPerformanceChartsProps {
  modelStats: ModelStats[];
}

export function ModelPerformanceCharts({ modelStats }: ModelPerformanceChartsProps) {
  return (
    <Tabs defaultValue="comparison" className="w-full">
      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto">
        <TabsTrigger value="comparison" className="text-sm">Model Comparison</TabsTrigger>
        <TabsTrigger value="scatter" className="text-sm">Safety vs Helpfulness</TabsTrigger>
      </TabsList>
      
      <TabsContent value="comparison" className="space-y-4">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelStats} margin={{ top: 20, right: 10, left: 10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="model" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${(value * 100).toFixed(1)}%`,
                  name === 'avgSafety' ? 'Safety' : name === 'avgHelp' ? 'Helpfulness' : 'Effectiveness'
                ]}
              />
              <Bar dataKey="avgSafety" name="avgSafety" fill="hsl(var(--chart-1))" />
              <Bar dataKey="avgHelp" name="avgHelp" fill="hsl(var(--chart-3))" />
              <Bar dataKey="effectiveness" name="effectiveness" fill="hsl(var(--chart-4))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>
      
      <TabsContent value="scatter" className="space-y-4">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={modelStats} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                type="number"
                dataKey="avgSafety"
                name="Safety"
                domain={[0, 1]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis 
                type="number"
                dataKey="avgHelp"
                name="Helpfulness"
                domain={[0, 1]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${(value * 100).toFixed(1)}%`,
                  name === 'avgSafety' ? 'Safety' : 'Helpfulness'
                ]}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload as ModelStats | undefined;
                  return data ? `${data.model} (${data.prompts} prompts)` : '';
                }}
              />
              <Scatter name="Models" fill="hsl(var(--chart-4))">
                {modelStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm text-muted-foreground">
          Each point represents a model&apos;s performance. The ideal position is the top-right (high safety, high helpfulness).
        </div>
      </TabsContent>
    </Tabs>
  );
}