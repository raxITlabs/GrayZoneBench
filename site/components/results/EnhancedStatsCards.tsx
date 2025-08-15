/**
 * Enhanced Statistics Cards with Accessible Visualizations
 * Shows detailed metrics with WCAG AAA compliance
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Brain, 
  TrendingUp, 
  BarChart3,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { ModelStats, RunInfo, CompleteModelResult } from '@/types/evaluation';

interface EnhancedStatsCardsProps {
  modelStats: ModelStats[];
  runInfo?: RunInfo;
  results: CompleteModelResult[];
  className?: string;
}

// Color palette matching your design system
const COLORS = {
  primary: 'var(--chart-1)',
  secondary: 'var(--chart-2)', 
  accent: 'var(--chart-3)',
  warning: 'var(--chart-4)',
  success: 'var(--chart-1)',
  danger: 'var(--destructive)'
};

const RESPONSE_MODE_COLORS = {
  'constructive-refusal': COLORS.primary,
  'safe-completion': COLORS.secondary,
  'direct-answer': COLORS.accent
};

const GRAY_ZONE_COLORS = {
  'clear-harmful': COLORS.danger,
  'clear-safe': COLORS.success,
  'ambiguous-dual-use': COLORS.warning,
  'contextual': COLORS.secondary
};

// Accessible custom tooltip
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}${entry.dataKey.includes('avg') || entry.dataKey.includes('effectiveness') ? '%' : ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function EnhancedStatsCards({ 
  modelStats, 
  runInfo, 
  results, 
  className = '' 
}: EnhancedStatsCardsProps) {
  // Ensure modelStats is an array
  const safeModelStats = Array.isArray(modelStats) ? modelStats : [];
  
  // Calculate aggregate statistics
  const totalPrompts = results.length;
  const totalModels = safeModelStats.length;
  const avgSafety = totalModels > 0 ? safeModelStats.reduce((sum, stat) => sum + stat.avgSafety, 0) / totalModels : 0;
  const avgHelpfulness = totalModels > 0 ? safeModelStats.reduce((sum, stat) => sum + stat.avgHelpfulness, 0) / totalModels : 0;
  const avgEffectiveness = avgSafety * avgHelpfulness;
  const avgTokens = totalModels > 0 ? safeModelStats.reduce((sum, stat) => sum + stat.avgTokens, 0) / totalModels : 0;
  
  // Response modes distribution across all results (if data is available)
  const responseModeData = results.length > 0 && results[0].judge?.safety_raw?.deterministic_features 
    ? Object.entries(
        results.reduce((acc, result) => {
          const mode = result.judge?.safety_raw?.deterministic_features?.response_mode;
          if (mode) {
            acc[mode] = (acc[mode] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name: name.replace('-', ' '), value, fullName: name }))
    : [];

  // Gray zone types distribution (if data is available)
  const grayZoneData = results.length > 0 && results[0].judge?.safety_raw?.gray_zone_navigation
    ? Object.entries(
        results.reduce((acc, result) => {
          const type = result.judge?.safety_raw?.gray_zone_navigation?.gray_zone_type;
          if (type) {
            acc[type] = (acc[type] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name: name.replace('-', ' '), value, fullName: name }))
    : [];

  // Model performance data for bar chart
  const modelPerformanceData = safeModelStats.slice(0, 8).map(stat => ({
    name: stat.model.replace(/^(gpt-|claude-|gemini-)/i, ''),
    safety: Math.round(stat.avgSafety * 100),
    helpfulness: Math.round(stat.avgHelpfulness * 100),
    effectiveness: Math.round(stat.effectiveness * 100)
  }));

  return (
    <div className={`grid grid-cols-1 gap-6 ${className}`}>
      {/* Overview Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-1">{totalModels}</div>
            <p className="text-sm text-muted-foreground">Evaluated models</p>
            {runInfo && (
              <p className="text-xs text-muted-foreground mt-1">
                {runInfo.num_prompts} prompts each
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgSafety > 0.7 ? 'text-green-600' : avgSafety > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
              {(avgSafety * 100).toFixed(1)}%
            </div>
            <Progress 
              value={avgSafety * 100} 
              className="mt-2 h-2"
              aria-label={`Average safety score: ${(avgSafety * 100).toFixed(1)}%`}
            />
            <p className="text-sm text-muted-foreground mt-2">Average across models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Helpfulness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgHelpfulness > 0.7 ? 'text-chart-3' : 'text-muted-foreground'}`}>
              {(avgHelpfulness * 100).toFixed(1)}%
            </div>
            <Progress 
              value={avgHelpfulness * 100} 
              className="mt-2 h-2"
              aria-label={`Average helpfulness score: ${(avgHelpfulness * 100).toFixed(1)}%`}
            />
            <p className="text-sm text-muted-foreground mt-2">Average across models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgEffectiveness > 0.6 ? 'text-chart-4' : 'text-muted-foreground'}`}>
              {(avgEffectiveness * 100).toFixed(1)}%
            </div>
            <Progress 
              value={avgEffectiveness * 100} 
              className="mt-2 h-2"
              aria-label={`Average effectiveness score: ${(avgEffectiveness * 100).toFixed(1)}%`}
            />
            <p className="text-sm text-muted-foreground mt-2">Safety × Helpfulness</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Performance Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Model Performance Comparison
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Top performing models by safety, helpfulness, and effectiveness
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80" role="img" aria-label="Model performance comparison chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={modelPerformanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                accessibilityLayer
              >
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  height={60}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="safety" 
                  fill={COLORS.primary}
                  name="Safety"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="helpfulness" 
                  fill={COLORS.secondary}
                  name="Helpfulness"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="effectiveness" 
                  fill={COLORS.warning}
                  name="Effectiveness"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Alternative text representation for screen readers */}
          <div className="sr-only">
            <h3>Model Performance Data Table</h3>
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Safety (%)</th>
                  <th>Helpfulness (%)</th>
                  <th>Effectiveness (%)</th>
                </tr>
              </thead>
              <tbody>
                {modelPerformanceData.map((model) => (
                  <tr key={model.name}>
                    <td>{model.name}</td>
                    <td>{model.safety}</td>
                    <td>{model.helpfulness}</td>
                    <td>{model.effectiveness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Charts Row */}
      {(responseModeData.length > 0 || grayZoneData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Modes Distribution */}
          {responseModeData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Response Modes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribution of response types across all evaluations
                </p>
              </CardHeader>
              <CardContent>
            <div className="h-64" role="img" aria-label="Response modes distribution">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer>
                  <Pie
                    data={responseModeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {responseModeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={RESPONSE_MODE_COLORS[entry.fullName as keyof typeof RESPONSE_MODE_COLORS] || COLORS.accent}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-4">
              {responseModeData.map((entry) => (
                <Badge 
                  key={entry.fullName}
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: RESPONSE_MODE_COLORS[entry.fullName as keyof typeof RESPONSE_MODE_COLORS] || COLORS.accent 
                    }}
                    aria-hidden="true"
                  />
                  {entry.name} ({entry.value})
                </Badge>
              ))}
            </div>
            
            {/* Screen reader table */}
            <div className="sr-only">
              <h3>Response Modes Distribution Table</h3>
              <table>
                <thead>
                  <tr>
                    <th>Response Mode</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {responseModeData.map((entry) => (
                    <tr key={entry.fullName}>
                      <td>{entry.name}</td>
                      <td>{entry.value}</td>
                      <td>{((entry.value / totalPrompts) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          )}

          {/* Gray Zone Types Distribution */}
          {grayZoneData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Gray Zone Types
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Classification of evaluation scenarios
                </p>
              </CardHeader>
              <CardContent>
            <div className="h-64" role="img" aria-label="Gray zone types distribution">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer>
                  <Pie
                    data={grayZoneData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {grayZoneData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={GRAY_ZONE_COLORS[entry.fullName as keyof typeof GRAY_ZONE_COLORS] || COLORS.accent}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-4">
              {grayZoneData.map((entry) => (
                <Badge 
                  key={entry.fullName}
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: GRAY_ZONE_COLORS[entry.fullName as keyof typeof GRAY_ZONE_COLORS] || COLORS.accent 
                    }}
                    aria-hidden="true"
                  />
                  {entry.name} ({entry.value})
                </Badge>
              ))}
            </div>
            
            {/* Screen reader table */}
            <div className="sr-only">
              <h3>Gray Zone Types Distribution Table</h3>
              <table>
                <thead>
                  <tr>
                    <th>Gray Zone Type</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {grayZoneData.map((entry) => (
                    <tr key={entry.fullName}>
                      <td>{entry.name}</td>
                      <td>{entry.value}</td>
                      <td>{((entry.value / totalPrompts) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          )}
        </div>
      )}

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-muted-foreground">
              {Math.round(avgTokens).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Tokens per evaluation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              High Performing Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-chart-1">
              {safeModelStats.filter(stat => stat.effectiveness > 0.6).length}
            </div>
            <p className="text-xs text-muted-foreground">Above 60% effectiveness</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-chart-2">
              {totalModels > 0 ? (safeModelStats.reduce((sum, stat) => sum + stat.avgConfidence, 0) / totalModels * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">Evaluation confidence</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}