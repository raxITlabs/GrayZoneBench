/**
 * Data transformation utilities for GrayZoneBench dashboard
 */

import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';

export interface ProviderStats {
  provider: string;
  models: string[];
  avgSafety: number;
  avgHelpfulness: number;
  avgEffectiveness: number;
  totalEvaluations: number;
  color: string;
}

export interface ChartDataPoint {
  name: string;
  'Safety Score': number;
  'Helpfulness Score': number;
  'Effectiveness': number;
  provider: string;
  color: string;
  [key: string]: string | number; // Index signature for Nivo compatibility
}

export interface ScatterDataPoint {
  id: string;           // Model name
  x: number;           // Safety Score (0-1)
  y: number;           // Helpfulness Score (0-1)
  size: number;        // Effectiveness (for point size)
  provider: string;    // For color grouping
  color: string;       // Theme-aware color
  modelName: string;   // Full model name for tooltips
  evaluations: number; // Number of evaluations
  tokens: number;      // Total tokens used
}

export interface BenchmarkTableRow {
  model: string;
  provider: string;
  safety: number;
  helpfulness: number;
  effectiveness: number;
  responseMode: string;
  tokens: number;
  evaluations: number;
}

// Note: Provider colors are now handled dynamically in components using getDynamicProviderColors()

/**
 * Detect provider from model name
 */
export function detectProvider(modelName: string): string {
  const name = modelName.toLowerCase();
  
  if (name.includes('gpt') || name.includes('o1') || name.includes('o3')) {
    return 'OpenAI';
  }
  if (name.includes('claude')) {
    return 'Anthropic';
  }
  if (name.includes('gemini') || name.includes('palm') || name.includes('bison')) {
    return 'Google';
  }
  
  return 'Unknown';
}

/**
 * Calculate average scores from model results
 */
function calculateModelAverages(modelData: ModelData) {
  const results = Object.values(modelData.results || {});
  
  if (results.length === 0) {
    return {
      avgSafety: 0,
      avgHelpfulness: 0,
      avgEffectiveness: 0,
      totalEvaluations: 0,
      responseMode: 'Unknown'
    };
  }

  const safetyScores = results.map(r => r.detailed_safety_score || 0);
  const helpfulnessScores = results.map(r => r.detailed_helpfulness_score || 0);
  const totalTokens = results.reduce((sum, r) => sum + (r.input_tokens || 0) + (r.output_tokens || 0), 0);
  
  // Find most common response mode from agent analysis (fallback to deterministic)
  const responseModes = results
    .map(r => {
      // Try agent consensus result first, then gray zone navigation, then deterministic fallback
      return r.safety_tier_results?.agent?.raw?.consensus_result?.gray_zone_result?.response_mode ||
             r.safety_tier_results?.agent?.raw?.gray_zone_navigation?.response_mode ||
             r.safety_tier_results?.deterministic?.response_mode ||
             'Unknown';
    })
    .filter(mode => mode !== 'Unknown');
  
  const modeCount = responseModes.reduce((acc, mode) => {
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonMode = Object.entries(modeCount)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Unknown';

  const avgSafety = safetyScores.reduce((sum, score) => sum + score, 0) / safetyScores.length;
  const avgHelpfulness = helpfulnessScores.reduce((sum, score) => sum + score, 0) / helpfulnessScores.length;
  
  return {
    avgSafety,
    avgHelpfulness,
    avgEffectiveness: avgSafety * avgHelpfulness,
    totalEvaluations: results.length,
    totalTokens,
    responseMode: mostCommonMode
  };
}

/**
 * Group models by provider and calculate aggregate statistics
 */
export function groupByProvider(
  modelData: Record<string, ModelData>,
  selectedProviders: string[] = []
): ProviderStats[] {
  const providerGroups = new Map<string, {
    models: string[];
    safetyScores: number[];
    helpfulnessScores: number[];
    totalEvaluations: number;
  }>();

  // Group models by provider
  Object.entries(modelData).forEach(([modelName, data]) => {
    const provider = detectProvider(modelName);
    
    // Skip if provider not selected
    if (selectedProviders.length > 0 && !selectedProviders.includes(provider)) {
      return;
    }

    const averages = calculateModelAverages(data);
    
    if (!providerGroups.has(provider)) {
      providerGroups.set(provider, {
        models: [],
        safetyScores: [],
        helpfulnessScores: [],
        totalEvaluations: 0
      });
    }

    const group = providerGroups.get(provider)!;
    group.models.push(modelName);
    group.safetyScores.push(averages.avgSafety);
    group.helpfulnessScores.push(averages.avgHelpfulness);
    group.totalEvaluations += averages.totalEvaluations;
  });

  // Calculate provider averages
  return Array.from(providerGroups.entries()).map(([provider, group]) => {
    const avgSafety = group.safetyScores.reduce((sum, score) => sum + score, 0) / group.safetyScores.length;
    const avgHelpfulness = group.helpfulnessScores.reduce((sum, score) => sum + score, 0) / group.helpfulnessScores.length;
    
    return {
      provider,
      models: group.models,
      avgSafety,
      avgHelpfulness,
      avgEffectiveness: avgSafety * avgHelpfulness,
      totalEvaluations: group.totalEvaluations,
      color: '' // Color will be assigned dynamically in components
    };
  }).sort((a, b) => b.avgEffectiveness - a.avgEffectiveness); // Sort by effectiveness descending
}

/**
 * Prepare data for Nivo bar chart
 */
export function prepareChartData(
  data: ProviderStats[] | Record<string, ModelData>,
  selectedMetrics: string[],
  isGroupedByProvider: boolean,
  selectedProviders: string[] = []
): ChartDataPoint[] {
  if (isGroupedByProvider && Array.isArray(data)) {
    // Provider-grouped data
    return data.map(provider => ({
      name: provider.provider,
      'Safety Score': provider.avgSafety,
      'Helpfulness Score': provider.avgHelpfulness,
      'Effectiveness': provider.avgEffectiveness,
      provider: provider.provider,
      color: provider.color
    }));
  } else if (!isGroupedByProvider && !Array.isArray(data)) {
    // Individual model data
    return Object.entries(data)
      .filter(([modelName]) => {
        if (selectedProviders.length === 0) return true;
        const provider = detectProvider(modelName);
        return selectedProviders.includes(provider);
      })
      .map(([modelName, modelData]) => {
        const averages = calculateModelAverages(modelData);
        const provider = detectProvider(modelName);
        
        return {
          name: modelName,
          'Safety Score': averages.avgSafety,
          'Helpfulness Score': averages.avgHelpfulness,
          'Effectiveness': averages.avgEffectiveness,
          provider: provider,
          color: '' // Color will be assigned dynamically in components
        };
      })
      .sort((a, b) => b['Effectiveness'] - a['Effectiveness']); // Sort by effectiveness
  }
  
  return [];
}

/**
 * Prepare data for the data table
 */
export function prepareTableData(
  modelData: Record<string, ModelData>,
  selectedProviders: string[] = []
): BenchmarkTableRow[] {
  return Object.entries(modelData)
    .filter(([modelName]) => {
      if (selectedProviders.length === 0) return true;
      const provider = detectProvider(modelName);
      return selectedProviders.includes(provider);
    })
    .map(([modelName, data]) => {
      const averages = calculateModelAverages(data);
      const provider = detectProvider(modelName);
      
      return {
        model: modelName,
        provider,
        safety: averages.avgSafety,
        helpfulness: averages.avgHelpfulness,
        effectiveness: averages.avgEffectiveness,
        responseMode: averages.responseMode,
        tokens: averages.totalTokens || 0,
        evaluations: averages.totalEvaluations
      };
    })
    .sort((a, b) => b.effectiveness - a.effectiveness); // Sort by effectiveness descending
}

/**
 * Extract unique providers from metadata using the provider field in models_info
 */
export function getUniqueProvidersFromMetadata(metadata: BenchmarkMetadata): string[] {
  if (!metadata?.models_info) return [];
  
  const providers = Object.values(metadata.models_info)
    .map(modelInfo => modelInfo.provider)
    .filter(provider => provider && provider !== 'Unknown'); // Filter out null/undefined/Unknown
  
  return [...new Set(providers)].sort(); // Unique and sorted
}

/**
 * Extract unique providers from model data
 */
export function getUniqueProvidersFromModelData(modelData: Record<string, ModelData>): string[] {
  const providers = Object.keys(modelData)
    .map(modelName => detectProvider(modelName))
    .filter(provider => provider && provider !== 'Unknown');
  
  return [...new Set(providers)].sort(); // Unique and sorted for consistency
}

/**
 * Get dynamic color mapping for providers using CSS chart variables
 */
export function getDynamicProviderColors(providers: string[]): Record<string, string> {
  const chartColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
  const colorMap: Record<string, string> = {};
  
  providers.forEach((provider, index) => {
    const colorVar = chartColors[index % chartColors.length];
    
    if (typeof window !== 'undefined') {
      // Client-side: read CSS variable
      const style = getComputedStyle(document.documentElement);
      const color = style.getPropertyValue(colorVar).trim();
      
      if (color === '') {
        // Fallback if CSS variable is not available
        const fallbackColors = {
          '--chart-1': '#644a40',
          '--chart-2': '#ffdfb5', 
          '--chart-3': '#e8e8e8',
          '--chart-4': '#ffe6c4',
          '--chart-5': '#66493e'
        };
        colorMap[provider] = fallbackColors[colorVar as keyof typeof fallbackColors];
      } else {
        colorMap[provider] = color;
      }
    } else {
      // Server-side: use fallback based on light mode values
      const fallbackColors = {
        '--chart-1': '#644a40',
        '--chart-2': '#ffdfb5', 
        '--chart-3': '#e8e8e8',
        '--chart-4': '#ffe6c4',
        '--chart-5': '#66493e'
      };
      colorMap[provider] = fallbackColors[colorVar as keyof typeof fallbackColors];
    }
  });
  
  return colorMap;
}

/**
 * Prepare data for scatter plot visualization
 */
export function prepareScatterData(
  modelData: Record<string, ModelData>,
  selectedProviders: string[] = []
): ScatterDataPoint[] {
  return Object.entries(modelData)
    .filter(([modelName]) => {
      if (selectedProviders.length === 0) return true;
      const provider = detectProvider(modelName);
      return selectedProviders.includes(provider);
    })
    .map(([modelName, data]) => {
      const averages = calculateModelAverages(data);
      const provider = detectProvider(modelName);
      
      return {
        id: modelName,
        x: averages.avgSafety,
        y: averages.avgHelpfulness,
        size: averages.avgEffectiveness * 100, // Scale for point size (0-100)
        provider: provider,
        color: '', // Color will be applied in component
        modelName: modelName,
        evaluations: averages.totalEvaluations,
        tokens: averages.totalTokens || 0
      };
    })
    .sort((a, b) => b.size - a.size); // Sort by effectiveness (size) descending
}

/**
 * Prepare aggregated provider data for scatter plot
 */
export function prepareProviderScatterData(
  modelData: Record<string, ModelData>,
  selectedProviders: string[] = []
): ScatterDataPoint[] {
  // Group models by provider first
  const providerGroups = groupByProvider(modelData, selectedProviders);
  
  return providerGroups.map(provider => {
    return {
      id: provider.provider,
      x: provider.avgSafety,
      y: provider.avgHelpfulness,
      size: provider.avgEffectiveness * 100, // Scale for point size (0-100)
      provider: provider.provider,
      color: '', // Color will be applied in component
      modelName: `${provider.provider} (${provider.models.length} models)`,
      evaluations: provider.totalEvaluations,
      tokens: 0 // Not relevant for provider aggregation
    };
  })
  .sort((a, b) => b.size - a.size); // Sort by effectiveness descending
}

/**
 * Helper function to lighten a hex color
 */
function lightenColor(color: string, amount: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
    const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
    const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
  return color;
}

/**
 * Helper function to darken a hex color
 */
function darkenColor(color: string, amount: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.floor(r * (1 - amount));
    const newG = Math.floor(g * (1 - amount));
    const newB = Math.floor(b * (1 - amount));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
  return color;
}

// Old getProviderColor function removed - now using getDynamicProviderColors() for all color assignments