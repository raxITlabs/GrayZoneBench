/**
 * Utility functions for data processing and manipulation
 * These are synchronous functions that don't need caching
 */

import type { 
  BenchmarkMetadata,
  ModelData,
  SmartMergeResult,
  ModelStats
} from '@/types/evaluation';

// Cache for prefetched model data
const prefetchCache = new Map<string, { data: ModelData; timestamp: number }>();
const PREFETCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Get flat results for a specific model
 * Converts model data to flat array for easier processing
 */
export function getModelResultsFlat(modelData: ModelData): SmartMergeResult[] {
  return Object.values(modelData.results);
}

/**
 * Get flat results for multiple models
 * Combines all model results into a single flat array
 */
export function getMultipleModelsResultsFlat(modelDataMap: Record<string, ModelData | null>): SmartMergeResult[] {
  const allResults: SmartMergeResult[] = [];
  
  Object.values(modelDataMap).forEach(modelData => {
    if (modelData) {
      allResults.push(...getModelResultsFlat(modelData));
    }
  });
  
  return allResults;
}

/**
 * Calculate model statistics from metadata (instant, no additional fetch needed)
 */
export function getModelStatsFromMetadata(metadata: BenchmarkMetadata): ModelStats[] {
  // Check if models_info exists
  if (!metadata || !metadata.models_info) {
    console.warn('No models_info found in metadata');
    return [];
  }
  
  return Object.entries(metadata.models_info).map(([model, info]) => ({
    model,
    totalPrompts: info.total_prompts,
    avgSafety: info.avg_safety,
    avgHelpfulness: info.avg_helpfulness,
    effectiveness: info.avg_safety * info.avg_helpfulness,
    safeCount: info.safe_count,
    unsafeCount: info.unsafe_count,
    avgConfidence: 0, // Not available in metadata
    avgTokens: info.total_tokens / info.total_prompts,
    lastUpdated: info.last_updated,
    categories: {} // Not available in metadata
  })).sort((a, b) => b.effectiveness - a.effectiveness);
}

/**
 * Calculate detailed model statistics from full model data
 * Only call this when you have the full model data loaded
 */
export function calculateDetailedModelStats(modelData: ModelData): ModelStats {
  const results = getModelResultsFlat(modelData);
  
  const safetyScores = results.map(r => r.detailed_safety_score).filter(s => s != null);
  const helpfulnessScores = results.map(r => r.detailed_helpfulness_score).filter(s => s != null);
  const confidenceScores = results.map(r => r.safety_confidence).filter(s => s != null);
  const tokens = results.map(r => r.input_tokens + r.output_tokens).filter(t => t > 0);

  const avgSafety = safetyScores.length > 0 ? safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length : 0;
  const avgHelpfulness = helpfulnessScores.length > 0 ? helpfulnessScores.reduce((a, b) => a + b, 0) / helpfulnessScores.length : 0;
  const avgTokens = tokens.length > 0 ? tokens.reduce((a, b) => a + b, 0) / tokens.length : 0;

  // Count safe vs unsafe
  const safeCount = results.filter(r => r.safety === 'SAFE').length;
  const unsafeCount = results.filter(r => r.safety === 'UNSAFE').length;

  // Group by categories
  const categories = results.reduce((acc, result) => {
    const cat = result.category || 'unknown';
    if (!acc[cat]) {
      acc[cat] = { count: 0, avgSafety: 0, avgHelpfulness: 0 };
    }
    acc[cat].count++;
    if (result.detailed_safety_score != null) {
      acc[cat].avgSafety += result.detailed_safety_score;
    }
    if (result.detailed_helpfulness_score != null) {
      acc[cat].avgHelpfulness += result.detailed_helpfulness_score;
    }
    return acc;
  }, {} as Record<string, { count: number; avgSafety: number; avgHelpfulness: number }>);

  // Calculate averages for categories
  Object.keys(categories).forEach(cat => {
    if (categories[cat].count > 0) {
      categories[cat].avgSafety /= categories[cat].count;
      categories[cat].avgHelpfulness /= categories[cat].count;
    }
  });

  return {
    model: modelData.model,
    totalPrompts: results.length,
    avgSafety,
    avgHelpfulness,
    effectiveness: avgSafety * avgHelpfulness,
    safeCount,
    unsafeCount,
    avgConfidence: confidenceScores.length > 0 ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0,
    avgTokens,
    lastUpdated: modelData.last_updated,
    categories
  };
}

/**
 * Get models that are commonly compared together
 * This uses heuristics based on model names and providers
 */
export function getRelatedModels(currentModel: string, allModels: string[]): string[] {
  const related: string[] = [];
  
  // Same provider models (e.g., gpt-4o-mini -> gpt-5-mini)
  const currentProvider = currentModel.split('-')[0];
  const sameProvider = allModels.filter(m => 
    m !== currentModel && m.startsWith(currentProvider)
  );
  related.push(...sameProvider);
  
  // Similar model sizes (mini, small, large)
  const currentSize = currentModel.includes('mini') ? 'mini' : 
                     currentModel.includes('small') ? 'small' : 
                     currentModel.includes('large') ? 'large' : 'standard';
  
  const similarSize = allModels.filter(m => 
    m !== currentModel && 
    !related.includes(m) &&
    (currentSize === 'mini' ? m.includes('mini') :
     currentSize === 'small' ? m.includes('small') :
     currentSize === 'large' ? m.includes('large') : true)
  );
  related.push(...similarSize);
  
  // Add remaining models
  related.push(...allModels.filter(m => m !== currentModel && !related.includes(m)));
  
  return related;
}

/**
 * Clean up old prefetch cache entries
 */
export function cleanupPrefetchCache(): void {
  const now = Date.now();
  for (const [model, cached] of prefetchCache.entries()) {
    if (now - cached.timestamp > PREFETCH_CACHE_TTL) {
      prefetchCache.delete(model);
    }
  }
}

/**
 * Get prefetch cache statistics (for debugging)
 */
export function getPrefetchCacheStats(): { size: number; models: string[] } {
  return {
    size: prefetchCache.size,
    models: Array.from(prefetchCache.keys())
  };
}

/**
 * Manage prefetch cache
 */
export function getPrefetchCache() {
  return prefetchCache;
}

/**
 * Intelligent prefetching based on user behavior patterns
 * This function is a wrapper that calls the async prefetchModelData
 */
export function prefetchRelatedModels(currentModel: string, allModels: string[], prefetchFn: (model: string) => Promise<void>): void {
  // Prefetch models that are commonly viewed together
  const relatedModels = getRelatedModels(currentModel, allModels);
  
  // Prefetch top 2 related models
  relatedModels.slice(0, 2).forEach(model => {
    // Use setTimeout to not block current operations
    setTimeout(() => prefetchFn(model), 100);
  });
}

export { PREFETCH_CACHE_TTL };