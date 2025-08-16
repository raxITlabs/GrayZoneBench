/**
 * Data Transformation Utilities for Nivo Components
 * Transforms actual GCS API data into Nivo-compatible formats
 */

import type { 
  ModelData, 
  SmartMergeResult, 
  BenchmarkMetadata,
  ModelStats 
} from '@/types/evaluation';

/**
 * Transform data for @nivo/scatterplot - Safety vs Helpfulness analysis
 */
export interface ScatterPlotPoint {
  x: number;  // safety score
  y: number;  // helpfulness score
  id: string;
  model: string;
  category: string;
  responseMode?: string;
  confidence: number;
  size?: number;
}

export interface ScatterPlotData {
  id: string;
  data: ScatterPlotPoint[];
}

export function transformForScatterPlot(
  modelDataMap: Record<string, ModelData>
): ScatterPlotData[] {
  const result: ScatterPlotData[] = [];
  
  Object.entries(modelDataMap).forEach(([modelName, modelData]) => {
    if (!modelData?.results) return;
    
    const points = Object.values(modelData.results).map(result => ({
      x: result.detailed_safety_score || 0,
      y: result.detailed_helpfulness_score || 0,
      id: `${result.model}-${result.hf_index}`,
      model: result.model,
      category: result.category,
      responseMode: result.safety_tier_results?.deterministic?.response_mode,
      confidence: (result.safety_confidence + result.helpfulness_confidence) / 2,
      size: ((result.safety_confidence + result.helpfulness_confidence) / 2) * 20
    }));
    
    result.push({
      id: modelName,
      data: points
    });
  });
  
  return result;
}

/**
 * Transform data for @nivo/sankey - Three-tier evaluation flow
 */
export interface SankeyNode {
  id: string;
  nodeColor?: string;
  label?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  startColor?: string;
  endColor?: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function transformForSankey(
  modelData: ModelData
): SankeyData {
  if (!modelData?.results) {
    return { nodes: [], links: [] };
  }
  
  const results = Object.values(modelData.results);
  const totalCount = results.length;
  
  if (totalCount === 0) {
    return { nodes: [], links: [] };
  }
  
  // Count transitions through tiers
  const deterministicPassed = results.filter(r => {
    const score = r.safety_tier_results?.deterministic?.safety_score;
    return score !== undefined && score > 0.5;
  }).length;
  
  const moderationPassed = results.filter(r => 
    !r.safety_tier_results?.moderation?.flagged
  ).length;
  
  const agenticPassed = results.filter(r => 
    r.safety === 'SAFE'
  ).length;
  
  const nodes: SankeyNode[] = [
    { id: 'input', label: 'Input Prompts', nodeColor: 'hsl(210, 70%, 50%)' },
    { id: 'deterministic', label: 'Deterministic', nodeColor: 'hsl(120, 70%, 50%)' },
    { id: 'moderation', label: 'Moderation', nodeColor: 'hsl(60, 70%, 50%)' },
    { id: 'agentic', label: 'Agentic', nodeColor: 'hsl(300, 70%, 50%)' },
    { id: 'safe', label: 'Safe', nodeColor: 'hsl(120, 70%, 40%)' },
    { id: 'unsafe', label: 'Unsafe', nodeColor: 'hsl(0, 70%, 40%)' }
  ];
  
  const links: SankeyLink[] = [
    { source: 'input', target: 'deterministic', value: totalCount },
    { source: 'deterministic', target: 'moderation', value: deterministicPassed },
    { source: 'moderation', target: 'agentic', value: moderationPassed },
    { source: 'agentic', target: 'safe', value: agenticPassed },
    { source: 'agentic', target: 'unsafe', value: totalCount - agenticPassed }
  ];
  
  return { nodes, links };
}

/**
 * Transform data for @nivo/pie - Response mode distribution
 */
export interface PieData {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export function transformForPie(
  modelData: ModelData,
  field: 'response_mode' | 'category' | 'safety' = 'response_mode'
): PieData[] {
  if (!modelData?.results) return [];
  
  const distribution = new Map<string, number>();
  
  Object.values(modelData.results).forEach(result => {
    let key: string;
    switch (field) {
      case 'response_mode':
        key = result.safety_tier_results?.deterministic?.response_mode || 'unknown';
        break;
      case 'category':
        key = result.category || 'uncategorized';
        break;
      case 'safety':
        key = result.safety || 'unknown';
        break;
    }
    distribution.set(key, (distribution.get(key) || 0) + 1);
  });
  
  const colors: Record<string, string> = {
    'constructive-refusal': 'hsl(var(--chart-1))',
    'direct-answer': 'hsl(var(--chart-2))',
    'safe-completion': 'hsl(var(--chart-3))',
    'bare-refusal': 'hsl(var(--chart-4))',
    'SAFE': 'hsl(var(--chart-2))',
    'UNSAFE': 'hsl(var(--destructive))',
    'unknown': 'hsl(var(--muted-foreground))'
  };
  
  return Array.from(distribution.entries()).map(([id, value]) => ({
    id,
    label: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    color: colors[id] || 'hsl(var(--muted-foreground))'
  }));
}

/**
 * Transform data for @nivo/bar - Model performance comparison
 */
export interface BarData {
  model: string;
  safety: number;
  helpfulness: number;
  effectiveness: number;
  [key: string]: string | number;
}

export function transformForBar(metadata: BenchmarkMetadata): BarData[] {
  if (!metadata?.models_info) return [];
  
  return Object.entries(metadata.models_info).map(([model, info]) => ({
    model: model.replace(/^(gpt-|claude-|gemini-)/i, ''),
    safety: Math.round(info.avg_safety * 100),
    helpfulness: Math.round(info.avg_helpfulness * 100),
    effectiveness: Math.round(info.avg_safety * info.avg_helpfulness * 100)
  }));
}

/**
 * Transform data for @nivo/bar - Response mode effectiveness comparison
 */
export interface ResponseModeBarData {
  responseMode: string;
  label: string;
  count: number;
  avgEffectiveness: number;
  avgSafety: number;
  avgHelpfulness: number;
  color: string;
}

export function transformForResponseModeBar(
  modelDataMap: Record<string, ModelData>
): ResponseModeBarData[] {
  const responseModeStats = new Map<string, {
    count: number;
    totalSafety: number;
    totalHelpfulness: number;
    totalEffectiveness: number;
  }>();
  
  // Aggregate data across all selected models
  Object.values(modelDataMap).forEach(modelData => {
    if (!modelData?.results) return;
    
    Object.values(modelData.results).forEach(result => {
      const mode = result.safety_tier_results?.deterministic?.response_mode || 'unknown';
      const safety = result.detailed_safety_score || 0;
      const helpfulness = result.detailed_helpfulness_score || 0;
      const effectiveness = safety * helpfulness;
      
      if (!responseModeStats.has(mode)) {
        responseModeStats.set(mode, {
          count: 0,
          totalSafety: 0,
          totalHelpfulness: 0,
          totalEffectiveness: 0
        });
      }
      
      const stats = responseModeStats.get(mode)!;
      stats.count += 1;
      stats.totalSafety += safety;
      stats.totalHelpfulness += helpfulness;
      stats.totalEffectiveness += effectiveness;
    });
  });
  
  const colors: Record<string, string> = {
    'constructive-refusal': 'hsl(var(--chart-1))',
    'direct-answer': 'hsl(var(--chart-2))',
    'safe-completion': 'hsl(var(--chart-3))',
    'bare-refusal': 'hsl(var(--chart-4))',
    'unknown': 'hsl(var(--muted-foreground))'
  };
  
  return Array.from(responseModeStats.entries()).map(([mode, stats]) => ({
    responseMode: mode,
    label: mode.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: stats.count,
    avgEffectiveness: Math.round((stats.totalEffectiveness / stats.count) * 100),
    avgSafety: Math.round((stats.totalSafety / stats.count) * 100),
    avgHelpfulness: Math.round((stats.totalHelpfulness / stats.count) * 100),
    color: colors[mode] || 'hsl(var(--muted-foreground))'
  }));
}

/**
 * Transform data for @nivo/line - Performance trends
 */
export interface LinePoint {
  x: string | number;
  y: number;
}

export interface LineData {
  id: string;
  color?: string;
  data: LinePoint[];
}

export function transformForLine(
  modelDataHistory: Array<{ timestamp: string; stats: ModelStats }>
): LineData[] {
  if (!modelDataHistory || modelDataHistory.length === 0) return [];
  
  const safetyLine: LineData = {
    id: 'Safety',
    color: 'hsl(120, 70%, 50%)',
    data: []
  };
  
  const helpfulnessLine: LineData = {
    id: 'Helpfulness',
    color: 'hsl(210, 70%, 50%)',
    data: []
  };
  
  const effectivenessLine: LineData = {
    id: 'Effectiveness',
    color: 'hsl(300, 70%, 50%)',
    data: []
  };
  
  modelDataHistory.forEach(point => {
    const date = new Date(point.timestamp).toLocaleDateString();
    safetyLine.data.push({ x: date, y: point.stats.avgSafety * 100 });
    helpfulnessLine.data.push({ x: date, y: point.stats.avgHelpfulness * 100 });
    effectivenessLine.data.push({ x: date, y: point.stats.effectiveness * 100 });
  });
  
  return [safetyLine, helpfulnessLine, effectivenessLine];
}

/**
 * Transform data for @nivo/heatmap - Gray zone difficulty patterns
 */
export interface HeatmapData {
  id: string;
  data: Array<{
    x: string;
    y: number;
  }>;
}

export function transformForHeatmap(
  modelDataMap: Record<string, ModelData>
): HeatmapData[] {
  const categories = new Set<string>();
  const heatmapData: HeatmapData[] = [];
  
  // Collect all categories
  Object.values(modelDataMap).forEach(modelData => {
    if (!modelData?.results) return;
    Object.values(modelData.results).forEach(result => {
      if (result.category) {
        categories.add(result.category);
      }
    });
  });
  
  // Build heatmap data for each model
  Object.entries(modelDataMap).forEach(([modelName, modelData]) => {
    if (!modelData?.results) return;
    
    const modelRow: HeatmapData = {
      id: modelName,
      data: []
    };
    
    categories.forEach(category => {
      const categoryResults = Object.values(modelData.results).filter(
        r => r.category === category
      );
      
      if (categoryResults.length > 0) {
        const avgScore = categoryResults.reduce(
          (sum, r) => sum + (r.detailed_safety_score || 0), 
          0
        ) / categoryResults.length;
        
        modelRow.data.push({
          x: category,
          y: Math.round(avgScore * 100)
        });
      } else {
        modelRow.data.push({
          x: category,
          y: 0
        });
      }
    });
    
    heatmapData.push(modelRow);
  });
  
  return heatmapData;
}

/**
 * Transform data for @nivo/network - Model relationships
 */
export interface NetworkNode {
  id: string;
  radius: number;
  depth: number;
  color: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  distance: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export function transformForNetwork(
  metadata: BenchmarkMetadata
): NetworkData {
  if (!metadata?.models_info) {
    return { nodes: [], links: [] };
  }
  
  const nodes = Object.entries(metadata.models_info).map(([model, info], index) => ({
    id: model,
    radius: 5 + (info.avg_safety + info.avg_helpfulness) * 10,
    depth: index,
    color: `hsl(${index * 360 / Object.keys(metadata.models_info).length}, 70%, 50%)`
  }));
  
  const links: NetworkLink[] = [];
  
  // Create links based on performance similarity
  const models = Object.keys(metadata.models_info);
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const model1 = metadata.models_info[models[i]];
      const model2 = metadata.models_info[models[j]];
      
      const safetyDiff = Math.abs(model1.avg_safety - model2.avg_safety);
      const helpfulnessDiff = Math.abs(model1.avg_helpfulness - model2.avg_helpfulness);
      const similarity = 1 - (safetyDiff + helpfulnessDiff) / 2;
      
      if (similarity > 0.7) {  // Only connect similar models
        links.push({
          source: models[i],
          target: models[j],
          distance: 100 * (1 - similarity)
        });
      }
    }
  }
  
  return { nodes, links };
}

/**
 * Transform multiple models data for combined scatter plot
 */
export function transformMultipleModelsForScatter(
  results: SmartMergeResult[]
): ScatterPlotData[] {
  const modelGroups = new Map<string, ScatterPlotPoint[]>();
  
  results.forEach(result => {
    const model = result.model;
    if (!modelGroups.has(model)) {
      modelGroups.set(model, []);
    }
    
    modelGroups.get(model)!.push({
      x: result.detailed_safety_score || 0,
      y: result.detailed_helpfulness_score || 0,
      id: `${result.model}-${result.hf_index}`,
      model: result.model,
      category: result.category,
      responseMode: result.safety_tier_results?.deterministic?.response_mode,
      confidence: (result.safety_confidence + result.helpfulness_confidence) / 2,
      size: ((result.safety_confidence + result.helpfulness_confidence) / 2) * 20
    });
  });
  
  return Array.from(modelGroups.entries()).map(([model, data]) => ({
    id: model,
    data
  }));
}