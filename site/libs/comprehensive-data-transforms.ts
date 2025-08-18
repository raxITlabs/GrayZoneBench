/**
 * Enhanced data transformation utilities for comprehensive evaluation display
 * Extracts all available metrics from nested evaluation results
 */

import type { ModelData, SmartMergeResult } from '@/types/evaluation';
import type { 
  ModelCardData, 
  DetailedEvaluationTableRow, 
  SampleEvaluation,
  ModerationSummary,
  AgentEvaluationSummary,
  ColumnGroup,
  TableColumnConfig
} from '@/types/comprehensive-evaluation';
import { detectProvider } from './data-transforms';

/**
 * Extract comprehensive metrics from a single evaluation result
 */
function extractComprehensiveMetrics(result: SmartMergeResult) {
  // Safety tier results
  const safetyTiers = result.safety_tier_results || {};
  const helpfulnessTiers = result.helpfulness_tier_results || {};
  
  // Deterministic analysis
  const deterministic = safetyTiers.deterministic || {};
  const moderationResults = safetyTiers.moderation || {};
  const agentResults = safetyTiers.agent || {};
  
  // Agent raw data for detailed analysis
  const agentRaw = agentResults.raw || {};
  const consensusResult = agentRaw.consensus_result?.gray_zone_result || {};
  const grayZoneNav = agentRaw.gray_zone_navigation || {};
  const severityAssessment = agentRaw.severity_assessment || {};
  
  return {
    // Core metrics
    safety: result.detailed_safety_score || 0,
    helpfulness: result.detailed_helpfulness_score || 0,
    effectiveness: (result.detailed_safety_score || 0) * (result.detailed_helpfulness_score || 0),
    
    // Confidence metrics
    safetyConfidence: result.safety_confidence || 0,
    helpfulnessConfidence: result.helpfulness_confidence || 0,
    grayZoneEffectiveness: consensusResult.gray_zone_effectiveness || 0,
    navigationQuality: grayZoneNav.navigation_quality || 0,
    
    // Response analysis
    responseMode: consensusResult.response_mode || 
                 grayZoneNav.response_mode || 
                 deterministic.response_mode || 'unknown',
    responseModeConfidence: deterministic.response_mode_confidence || 0,
    refusalConfidence: deterministic.refusal_confidence || 0,
    alternativesProvided: deterministic.alternatives_provided || false,
    educationProvided: deterministic.education_provided || false,
    explanationProvided: deterministic.explanation_provided || false,
    
    // Evaluation tiers
    deterministicScore: deterministic.safety_score || 0,
    moderationScore: moderationResults.flagged ? 0 : 1, // Convert flagged to score
    agentScore: agentResults.safety_score || 0,
    tierUsed: determineTierUsed(safetyTiers),
    
    // Harm assessment
    meaningfulFacilitation: deterministic.meaningful_facilitation?.meaningful_facilitation_score || 0,
    facilitationLevel: deterministic.meaningful_facilitation?.facilitation_level || 'negligible',
    harmLevel: severityAssessment.harm_level || 'negligible',
    actionabilityScore: deterministic.actionability_score || 0,
    
    // Technical details
    inputTokens: result.input_tokens || 0,
    outputTokens: result.output_tokens || 0,
    totalTokens: (result.input_tokens || 0) + (result.output_tokens || 0),
    responseTime: moderationResults.response_time || agentRaw.cost_estimate || 0,
    costEstimate: agentRaw.cost_estimate || 0,
    evaluationMethod: agentResults.method || 'unknown',
    
    // Metadata
    category: result.category || 'unknown',
    timestamp: result.timestamp || '',
    
    // Sample data for detailed view
    prompt: agentRaw.prompt || '',
    response: agentRaw.response || '',
    safetyRationale: result.safety_rationale || '',
    helpfulnessRationale: result.helpfulness_rationale || '',
    grayZoneType: grayZoneNav.gray_zone_type || 'clear-harmful'
  };
}

/**
 * Determine which evaluation tier was actually used for the final decision
 */
function determineTierUsed(safetyTiers: any): 'deterministic' | 'moderation' | 'agent' {
  // Check if agent was used (has meaningful results)
  if (safetyTiers.agent?.safety_score && safetyTiers.agent.confidence > 0.5) {
    return 'agent';
  }
  
  // Check if moderation was used (flagged or has category scores)
  if (safetyTiers.moderation?.flagged !== undefined) {
    return 'moderation';
  }
  
  // Default to deterministic
  return 'deterministic';
}

/**
 * Calculate comprehensive averages from all model results
 */
function calculateComprehensiveAverages(modelData: ModelData): ModelCardData {
  const results = Object.values(modelData.results || {});
  
  if (results.length === 0) {
    const provider = detectProvider(modelData.model);
    return createEmptyModelCardData(modelData.model, provider);
  }

  // Extract metrics from all results
  const allMetrics = results.map(extractComprehensiveMetrics);
  
  // Calculate averages for all numeric fields
  const averages = {
    safety: average(allMetrics.map(m => m.safety)),
    helpfulness: average(allMetrics.map(m => m.helpfulness)),
    effectiveness: average(allMetrics.map(m => m.effectiveness)),
    
    safetyConfidence: average(allMetrics.map(m => m.safetyConfidence)),
    helpfulnessConfidence: average(allMetrics.map(m => m.helpfulnessConfidence)),
    grayZoneEffectiveness: average(allMetrics.map(m => m.grayZoneEffectiveness)),
    navigationQuality: average(allMetrics.map(m => m.navigationQuality)),
    
    responseModeConfidence: average(allMetrics.map(m => m.responseModeConfidence)),
    refusalConfidence: average(allMetrics.map(m => m.refusalConfidence)),
    
    deterministicScore: average(allMetrics.map(m => m.deterministicScore)),
    moderationScore: average(allMetrics.map(m => m.moderationScore)),
    agentScore: average(allMetrics.map(m => m.agentScore)),
    
    meaningfulFacilitation: average(allMetrics.map(m => m.meaningfulFacilitation)),
    actionabilityScore: average(allMetrics.map(m => m.actionabilityScore)),
    
    inputTokens: sum(allMetrics.map(m => m.inputTokens)),
    outputTokens: sum(allMetrics.map(m => m.outputTokens)),
    totalTokens: sum(allMetrics.map(m => m.totalTokens)),
    responseTime: average(allMetrics.map(m => m.responseTime)),
    costEstimate: sum(allMetrics.map(m => m.costEstimate))
  };
  
  // Calculate most common categorical values
  const mostCommonMode = mostFrequent(allMetrics.map(m => m.responseMode));
  const mostCommonFacilitationLevel = mostFrequent(allMetrics.map(m => m.facilitationLevel));
  const mostCommonHarmLevel = mostFrequent(allMetrics.map(m => m.harmLevel));
  const mostCommonTierUsed = mostFrequent(allMetrics.map(m => m.tierUsed));
  const mostCommonEvaluationMethod = mostFrequent(allMetrics.map(m => m.evaluationMethod));
  
  // Calculate boolean percentages
  const alternativesPercentage = allMetrics.filter(m => m.alternativesProvided).length / allMetrics.length > 0.5;
  const educationPercentage = allMetrics.filter(m => m.educationProvided).length / allMetrics.length > 0.5;
  const explanationPercentage = allMetrics.filter(m => m.explanationProvided).length / allMetrics.length > 0.5;
  
  // Get unique categories and sample rationales
  const categories = [...new Set(allMetrics.map(m => m.category))];
  const sampleRationales = allMetrics
    .map(m => m.safetyRationale)
    .filter(r => r && r.length > 10)
    .slice(0, 3); // Take first 3 meaningful rationales
  
  const provider = detectProvider(modelData.model);
  
  return {
    model: modelData.model,
    provider,
    
    // Core metrics
    ...averages,
    
    // Categorical values
    responseMode: mostCommonMode,
    facilitationLevel: mostCommonFacilitationLevel,
    harmLevel: mostCommonHarmLevel,
    tierUsed: mostCommonTierUsed,
    evaluationMethod: mostCommonEvaluationMethod,
    
    // Boolean values
    alternativesProvided: alternativesPercentage,
    educationProvided: educationPercentage,
    explanationProvided: explanationPercentage,
    
    // Metadata
    totalPrompts: results.length,
    lastUpdated: modelData.last_updated,
    categories,
    sampleRationales
  };
}

/**
 * Prepare data for model cards display
 */
export function prepareModelCardsData(
  modelData: Record<string, ModelData>,
  selectedProviders: string[] = []
): ModelCardData[] {
  return Object.entries(modelData)
    .filter(([modelName]) => {
      if (selectedProviders.length === 0) return true;
      const provider = detectProvider(modelName);
      return selectedProviders.includes(provider);
    })
    .map(([, data]) => calculateComprehensiveAverages(data))
    .sort((a, b) => b.effectiveness - a.effectiveness); // Sort by effectiveness descending
}

/**
 * Prepare data for detailed evaluation table
 */
export function prepareDetailedTableData(
  modelData: Record<string, ModelData>,
  selectedProviders: string[] = []
): DetailedEvaluationTableRow[] {
  const cardData = prepareModelCardsData(modelData, selectedProviders);
  
  return cardData.map((card): DetailedEvaluationTableRow => ({
    model: card.model,
    provider: card.provider,
    safety: card.safety,
    helpfulness: card.helpfulness,
    effectiveness: card.effectiveness,
    safetyConfidence: card.safetyConfidence,
    helpfulnessConfidence: card.helpfulnessConfidence,
    navigationQuality: card.navigationQuality,
    grayZoneEffectiveness: card.grayZoneEffectiveness,
    deterministicScore: card.deterministicScore,
    moderationScore: card.moderationScore,
    agentScore: card.agentScore,
    tierUsed: card.tierUsed,
    responseMode: card.responseMode,
    responseModeConfidence: card.responseModeConfidence,
    refusalConfidence: card.refusalConfidence,
    alternativesProvided: card.alternativesProvided,
    educationProvided: card.educationProvided,
    explanationProvided: card.explanationProvided,
    meaningfulFacilitation: card.meaningfulFacilitation,
    facilitationLevel: card.facilitationLevel,
    harmLevel: card.harmLevel,
    actionabilityScore: card.actionabilityScore,
    totalPrompts: card.totalPrompts,
    inputTokens: card.inputTokens,
    outputTokens: card.outputTokens,
    totalTokens: card.totalTokens,
    responseTime: card.responseTime,
    costEstimate: card.costEstimate,
    evaluationMethod: card.evaluationMethod,
    lastUpdated: card.lastUpdated
  }));
}

/**
 * Extract sample evaluations for detailed view
 */
export function extractSampleEvaluations(
  modelData: ModelData,
  maxSamples: number = 5
): SampleEvaluation[] {
  const results = Object.entries(modelData.results || {});
  
  return results
    .slice(0, maxSamples)
    .map(([promptId, result]): SampleEvaluation => {
      const metrics = extractComprehensiveMetrics(result);
      
      return {
        promptIndex: parseInt(promptId) || 0,
        category: metrics.category,
        prompt: metrics.prompt,
        response: metrics.response,
        safetyScore: metrics.safety,
        helpfulnessScore: metrics.helpfulness,
        effectivenessScore: metrics.effectiveness,
        safetyRationale: metrics.safetyRationale,
        helpfulnessRationale: metrics.helpfulnessRationale,
        grayZoneType: metrics.grayZoneType,
        responseMode: metrics.responseMode,
        tierUsed: metrics.tierUsed,
        timestamp: metrics.timestamp
      };
    });
}

/**
 * Get column groups configuration for detailed table
 */
export function getColumnGroups(): ColumnGroup[] {
  return [
    {
      id: 'core',
      label: 'Core Metrics',
      columns: ['model', 'provider', 'safety', 'helpfulness', 'effectiveness'],
      visible: true
    },
    {
      id: 'confidence',
      label: 'Confidence',
      columns: ['safetyConfidence', 'helpfulnessConfidence', 'navigationQuality', 'grayZoneEffectiveness'],
      visible: true
    },
    {
      id: 'tiers',
      label: 'Evaluation Tiers',
      columns: ['deterministicScore', 'moderationScore', 'agentScore', 'tierUsed'],
      visible: true
    },
    {
      id: 'response',
      label: 'Response Analysis',
      columns: ['responseMode', 'responseModeConfidence', 'refusalConfidence', 'alternativesProvided', 'educationProvided', 'explanationProvided'],
      visible: true
    },
    {
      id: 'harm',
      label: 'Harm Assessment',
      columns: ['meaningfulFacilitation', 'facilitationLevel', 'harmLevel', 'actionabilityScore'],
      visible: true
    },
    {
      id: 'technical',
      label: 'Technical Details',
      columns: ['totalPrompts', 'inputTokens', 'outputTokens', 'totalTokens', 'responseTime', 'costEstimate', 'evaluationMethod', 'lastUpdated'],
      visible: false // Hidden by default due to space
    }
  ];
}

/**
 * Get table column configuration
 */
export function getTableColumnConfig(): TableColumnConfig[] {
  return [
    // Core metrics
    { id: 'model', label: 'Model', type: 'string', sortable: true, groupId: 'core', sticky: true },
    { id: 'provider', label: 'Provider', type: 'string', sortable: true, groupId: 'core' },
    { id: 'safety', label: 'Safety', type: 'percentage', sortable: true, groupId: 'core' },
    { id: 'helpfulness', label: 'Helpfulness', type: 'percentage', sortable: true, groupId: 'core' },
    { id: 'effectiveness', label: 'Effectiveness', type: 'percentage', sortable: true, groupId: 'core' },
    
    // Confidence
    { id: 'safetyConfidence', label: 'Safety Confidence', type: 'percentage', sortable: true, groupId: 'confidence' },
    { id: 'helpfulnessConfidence', label: 'Helpfulness Confidence', type: 'percentage', sortable: true, groupId: 'confidence' },
    { id: 'navigationQuality', label: 'Navigation Quality', type: 'percentage', sortable: true, groupId: 'confidence' },
    { id: 'grayZoneEffectiveness', label: 'Gray Zone Effectiveness', type: 'percentage', sortable: true, groupId: 'confidence' },
    
    // Evaluation tiers
    { id: 'deterministicScore', label: 'Deterministic Score', type: 'percentage', sortable: true, groupId: 'tiers' },
    { id: 'moderationScore', label: 'Moderation Score', type: 'percentage', sortable: true, groupId: 'tiers' },
    { id: 'agentScore', label: 'Agent Score', type: 'percentage', sortable: true, groupId: 'tiers' },
    { id: 'tierUsed', label: 'Tier Used', type: 'string', sortable: true, groupId: 'tiers' },
    
    // Response analysis
    { id: 'responseMode', label: 'Response Mode', type: 'string', sortable: true, groupId: 'response' },
    { id: 'responseModeConfidence', label: 'Mode Confidence', type: 'percentage', sortable: true, groupId: 'response' },
    { id: 'refusalConfidence', label: 'Refusal Confidence', type: 'percentage', sortable: true, groupId: 'response' },
    { id: 'alternativesProvided', label: 'Alternatives', type: 'boolean', sortable: true, groupId: 'response' },
    { id: 'educationProvided', label: 'Education', type: 'boolean', sortable: true, groupId: 'response' },
    { id: 'explanationProvided', label: 'Explanation', type: 'boolean', sortable: true, groupId: 'response' },
    
    // Harm assessment
    { id: 'meaningfulFacilitation', label: 'Facilitation Score', type: 'percentage', sortable: true, groupId: 'harm' },
    { id: 'facilitationLevel', label: 'Facilitation Level', type: 'string', sortable: true, groupId: 'harm' },
    { id: 'harmLevel', label: 'Harm Level', type: 'string', sortable: true, groupId: 'harm' },
    { id: 'actionabilityScore', label: 'Actionability', type: 'percentage', sortable: true, groupId: 'harm' },
    
    // Technical details
    { id: 'totalPrompts', label: 'Prompts', type: 'number', sortable: true, groupId: 'technical' },
    { id: 'inputTokens', label: 'Input Tokens', type: 'number', sortable: true, groupId: 'technical' },
    { id: 'outputTokens', label: 'Output Tokens', type: 'number', sortable: true, groupId: 'technical' },
    { id: 'totalTokens', label: 'Total Tokens', type: 'number', sortable: true, groupId: 'technical' },
    { id: 'responseTime', label: 'Response Time', type: 'number', sortable: true, groupId: 'technical' },
    { id: 'costEstimate', label: 'Cost ($)', type: 'number', sortable: true, groupId: 'technical' },
    { id: 'evaluationMethod', label: 'Method', type: 'string', sortable: true, groupId: 'technical' },
    { id: 'lastUpdated', label: 'Last Updated', type: 'date', sortable: true, groupId: 'technical' }
  ];
}

// Utility functions
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function sum(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0);
}

function mostFrequent<T>(items: T[]): T {
  if (items.length === 0) return items[0];
  
  const counts = items.reduce((acc, item) => {
    acc[String(item)] = (acc[String(item)] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostFrequentKey = Object.entries(counts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];
    
  return items.find(item => String(item) === mostFrequentKey) || items[0];
}

function createEmptyModelCardData(model: string, provider: string): ModelCardData {
  return {
    model,
    provider,
    safety: 0,
    helpfulness: 0,
    effectiveness: 0,
    safetyConfidence: 0,
    helpfulnessConfidence: 0,
    grayZoneEffectiveness: 0,
    navigationQuality: 0,
    responseMode: 'unknown',
    responseModeConfidence: 0,
    refusalConfidence: 0,
    alternativesProvided: false,
    educationProvided: false,
    explanationProvided: false,
    deterministicScore: 0,
    moderationScore: 0,
    agentScore: 0,
    tierUsed: 'deterministic' as const,
    meaningfulFacilitation: 0,
    facilitationLevel: 'negligible' as const,
    harmLevel: 'negligible' as const,
    actionabilityScore: 0,
    totalPrompts: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    responseTime: 0,
    costEstimate: 0,
    evaluationMethod: 'unknown',
    lastUpdated: '',
    categories: [],
    sampleRationales: []
  };
}