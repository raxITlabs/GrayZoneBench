/**
 * Enhanced data fetching functions with caching for GrayZoneBench results
 * Uses Next.js canary 'use cache' directive for optimal performance
 */

'use cache'
import { bucket } from './gcs-client';
import type { 
  RunsList, 
  RunInfo, 
  CompleteModelResult, 
  ThreeTierEvaluation, 
  ModelResponse,
  ModelStats 
} from '@/types/evaluation';

/**
 * Fetch the latest benchmark results from GCS
 * Cached for 5 minutes to reduce API calls
 */
export async function fetchLatestResults() {
  'use cache'
  
  try {
    console.log('Fetching latest results from GCS...');
    const file = bucket.file('latest/results.json');
    const [contents] = await file.download();
    const results = JSON.parse(contents.toString());
    console.log(`Successfully fetched ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Failed to fetch latest results:', error);
    return null;
  }
}

/**
 * Fetch the index of all benchmark runs from GCS
 * Enhanced with proper typing
 */
export async function fetchRunsList(): Promise<RunsList> {
  'use cache'
  
  try {
    console.log('Fetching runs index from GCS...');
    const file = bucket.file('index.json');
    const [contents] = await file.download();
    const index = JSON.parse(contents.toString()) as RunsList;
    console.log(`Successfully fetched index with ${index.runs.length} runs`);
    return index;
  } catch (error) {
    console.error('Failed to fetch runs list:', error);
    return { runs: [], total: 0, updated_at: new Date().toISOString() };
  }
}

/**
 * Fetch the latest run with complete details
 */
export async function fetchLatestRunDetails(): Promise<{ run: RunInfo; results: CompleteModelResult[] } | null> {
  'use cache'
  
  try {
    console.log('Fetching latest run details...');
    const runsList = await fetchRunsList();
    
    if (runsList.runs.length === 0) {
      return null;
    }

    // Get the most recent run (runs are sorted by timestamp desc)
    const latestRun = runsList.runs[0];
    const results = await fetchCompleteRunResults(latestRun.timestamp);
    
    return { run: latestRun, results };
  } catch (error) {
    console.error('Failed to fetch latest run details:', error);
    return null;
  }
}

/**
 * Fetch complete results for a specific run including all model data
 */
export async function fetchCompleteRunResults(timestamp: string): Promise<CompleteModelResult[]> {
  'use cache'
  
  try {
    console.log(`Fetching complete results for run: ${timestamp}`);
    
    // First get the basic results
    const resultsFile = bucket.file(`runs/${timestamp}/results.json`);
    const [resultsContents] = await resultsFile.download();
    const basicResults = JSON.parse(resultsContents.toString());
    
    if (!Array.isArray(basicResults)) {
      console.warn(`Results for ${timestamp} is not an array`);
      return [];
    }

    // Get list of all models in this run
    const [files] = await bucket.getFiles({ prefix: `runs/${timestamp}/models/` });
    const modelDirs = new Set<string>();
    
    files.forEach(file => {
      const pathParts = file.name.split('/');
      if (pathParts.length >= 4 && pathParts[3]) {
        modelDirs.add(pathParts[3]);
      }
    });

    console.log(`Found ${modelDirs.size} models in run ${timestamp}`);
    
    // Fetch detailed data for each model
    const completeResults: CompleteModelResult[] = [];
    
    for (const model of Array.from(modelDirs)) {
      try {
        const modelResults = await fetchModelResults(timestamp, model);
        completeResults.push(...modelResults);
      } catch (error) {
        console.warn(`Failed to fetch results for model ${model}:`, error);
      }
    }
    
    console.log(`Successfully fetched ${completeResults.length} complete results`);
    return completeResults;
    
  } catch (error) {
    console.error(`Failed to fetch complete run results for ${timestamp}:`, error);
    return [];
  }
}

/**
 * Fetch detailed results for a specific model in a run
 */
export async function fetchModelResults(timestamp: string, model: string): Promise<CompleteModelResult[]> {
  'use cache'
  
  try {
    console.log(`Fetching model results: ${timestamp}/${model}`);
    
    // Get all files for this model
    const [files] = await bucket.getFiles({ 
      prefix: `runs/${timestamp}/models/${model}/` 
    });
    
    // Group files by row ID
    interface RowFiles {
      response?: ModelResponse;
      judge?: ThreeTierEvaluation;
      summary?: string;
    }
    const filesByRow = new Map<string, RowFiles>();
    
    for (const file of files) {
      const fileName = file.name.split('/').pop();
      if (!fileName) continue;
      
      const match = fileName.match(/^(row\d+)\.(response|judge\.response|md)\.?(json|md)?$/);
      if (!match) continue;
      
      const [, rowId, fileType] = match;
      
      if (!filesByRow.has(rowId)) {
        filesByRow.set(rowId, {});
      }
      
      const rowFiles = filesByRow.get(rowId)!;
      
      try {
        const [contents] = await file.download();
        const contentStr = contents.toString();
        
        if (fileType === 'response') {
          rowFiles.response = JSON.parse(contentStr);
        } else if (fileType === 'judge.response') {
          rowFiles.judge = JSON.parse(contentStr);
        } else if (fileName.endsWith('.md')) {
          rowFiles.summary = contentStr;
        }
      } catch (error) {
        console.warn(`Failed to parse file ${file.name}:`, error);
      }
    }
    
    // Convert to CompleteModelResult objects
    const results: CompleteModelResult[] = [];
    
    for (const [rowId, files] of filesByRow) {
      if (!files.response || !files.judge) {
        console.warn(`Incomplete data for ${model}/${rowId}`);
        continue;
      }
      
      const result: CompleteModelResult = {
        model,
        rowId,
        prompt: files.judge.safety_raw?.prompt || files.judge.helpfulness_raw?.prompt || 'Unknown prompt',
        response: files.response as ModelResponse,
        judge: files.judge as ThreeTierEvaluation,
        summary: files.summary || 'No summary available',
        category: files.judge.safety_raw?.category || 'unknown',
        timestamp,
        status: 'ok'
      };
      
      results.push(result);
    }
    
    console.log(`Successfully fetched ${results.length} results for model ${model}`);
    return results;
    
  } catch (error) {
    console.error(`Failed to fetch model results for ${timestamp}/${model}:`, error);
    return [];
  }
}

/**
 * Fetch a specific benchmark run by timestamp
 * Cached for longer (15 minutes) since historical data doesn't change
 */
export async function fetchSpecificRun(timestamp: string) {
  'use cache'
  
  try {
    console.log(`Fetching specific run: ${timestamp}`);
    const file = bucket.file(`runs/${timestamp}/results.json`);
    const [contents] = await file.download();
    const results = JSON.parse(contents.toString());
    console.log(`Successfully fetched run ${timestamp} with ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`Failed to fetch run ${timestamp}:`, error);
    return null;
  }
}

/**
 * Calculate enhanced model statistics from complete results
 */
export async function calculateModelStats(results: CompleteModelResult[]): Promise<ModelStats[]> {
  'use cache'
  const modelGroups = results.reduce((acc, result) => {
    if (!acc[result.model]) {
      acc[result.model] = [];
    }
    acc[result.model].push(result);
    return acc;
  }, {} as Record<string, CompleteModelResult[]>);

  return Object.entries(modelGroups).map(([model, modelResults]) => {
    const safetyScores = modelResults.map(r => r.judge.safety_raw.final_scores.safety).filter(s => s != null);
    const helpfulnessScores = modelResults.map(r => r.judge.helpfulness_raw.final_scores.helpfulness).filter(s => s != null);
    const confidenceScores = modelResults.map(r => r.judge.safety_raw.deterministic_features.confidence).filter(s => s != null);
    const costs = modelResults.map(r => r.judge.safety_raw.cost_estimate + r.judge.helpfulness_raw.cost_estimate).filter(c => c != null);

    const avgSafety = safetyScores.length > 0 ? safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length : 0;
    const avgHelpfulness = helpfulnessScores.length > 0 ? helpfulnessScores.reduce((a, b) => a + b, 0) / helpfulnessScores.length : 0;

    // Response modes distribution
    const responseModes = modelResults.reduce((acc, result) => {
      const mode = result.judge.safety_raw.deterministic_features.response_mode;
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gray zone types distribution
    const grayZoneTypes = modelResults.reduce((acc, result) => {
      const type = result.judge.safety_raw.gray_zone_navigation.gray_zone_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Tier usage (simplified - we'd need to analyze which tier made final decision)
    const tierUsage = {
      deterministic: modelResults.length, // All use deterministic
      moderation: modelResults.length,    // All use moderation
      agent: modelResults.length          // All use agent
    };

    return {
      model,
      totalPrompts: modelResults.length,
      avgSafety,
      avgHelpfulness,
      effectiveness: avgSafety * avgHelpfulness,
      responseModesDistribution: {
        'constructive-refusal': responseModes['constructive-refusal'] || 0,
        'direct-answer': responseModes['direct-answer'] || 0,
        'safe-completion': responseModes['safe-completion'] || 0
      },
      grayZoneTypes: {
        'clear-harmful': grayZoneTypes['clear-harmful'] || 0,
        'clear-safe': grayZoneTypes['clear-safe'] || 0,
        'ambiguous-dual-use': grayZoneTypes['ambiguous-dual-use'] || 0,
        'contextual': grayZoneTypes['contextual'] || 0
      },
      tierUsage,
      avgConfidence: confidenceScores.length > 0 ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0,
      avgCost: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0
    };
  }).sort((a, b) => b.effectiveness - a.effectiveness);
}