/**
 * Enhanced TypeScript types for comprehensive evaluation data display
 * Extends the base evaluation types with UI-focused interfaces
 */

import type { ModelData, SmartMergeResult, DeterministicFeatures } from './evaluation';

// Enhanced model card data structure
export interface ModelCardData {
  model: string;
  provider: string;
  
  // Core metrics (existing)
  safety: number;
  helpfulness: number;
  effectiveness: number;
  
  // Confidence metrics
  safetyConfidence: number;
  helpfulnessConfidence: number;
  grayZoneEffectiveness: number;
  navigationQuality: number;
  
  // Response analysis
  responseMode: string;
  responseModeConfidence: number;
  refusalConfidence: number;
  alternativesProvided: boolean;
  educationProvided: boolean;
  explanationProvided: boolean;
  
  // Evaluation tiers
  deterministicScore: number;
  moderationScore: number;
  agentScore: number;
  tierUsed: 'deterministic' | 'moderation' | 'agent';
  
  // Harm assessment
  meaningfulFacilitation: number;
  facilitationLevel: 'negligible' | 'low' | 'moderate' | 'high' | 'severe';
  harmLevel: 'negligible' | 'low' | 'moderate' | 'high' | 'severe';
  actionabilityScore: number;
  
  // Technical details
  totalPrompts: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseTime: number;
  costEstimate: number;
  evaluationMethod: string;
  
  // Additional metadata
  lastUpdated: string;
  categories: string[];
  sampleRationales: string[];
}

// Comprehensive table row for detailed evaluation table
export interface DetailedEvaluationTableRow {
  // Core identification
  model: string;
  provider: string;
  
  // Core metrics (5 columns)
  safety: number;
  helpfulness: number;
  effectiveness: number;
  
  // Confidence metrics (4 columns)
  safetyConfidence: number;
  helpfulnessConfidence: number;
  navigationQuality: number;
  grayZoneEffectiveness: number;
  
  // Evaluation tiers (4 columns)
  deterministicScore: number;
  moderationScore: number;
  agentScore: number;
  tierUsed: 'deterministic' | 'moderation' | 'agent';
  
  // Response analysis (6 columns)
  responseMode: string;
  responseModeConfidence: number;
  refusalConfidence: number;
  alternativesProvided: boolean;
  educationProvided: boolean;
  explanationProvided: boolean;
  
  // Harm assessment (4 columns)
  meaningfulFacilitation: number;
  facilitationLevel: 'negligible' | 'low' | 'moderate' | 'high' | 'severe';
  harmLevel: 'negligible' | 'low' | 'moderate' | 'high' | 'severe';
  actionabilityScore: number;
  
  // Technical details (8 columns)
  totalPrompts: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseTime: number;
  costEstimate: number;
  evaluationMethod: string;
  lastUpdated: string;

  // Sample data actions (new)
  samplePreview?: string;
  sampleActions?: string;
  hasDetailedSamples?: boolean;
}

// Column grouping for the detailed table
export interface ColumnGroup {
  id: string;
  label: string;
  columns: string[];
  visible: boolean;
}

// Sample evaluation with rationale for display
export interface SampleEvaluation {
  promptIndex: number;
  category: string;
  prompt: string;
  response: string;
  safetyScore: number;
  helpfulnessScore: number;
  effectivenessScore: number;
  safetyRationale: string;
  helpfulnessRationale: string;
  grayZoneType: 'clear-harmful' | 'clear-safe' | 'ambiguous-dual-use' | 'contextual';
  responseMode: string;
  tierUsed: 'deterministic' | 'moderation' | 'agent';
  timestamp: string;
}

// Moderation API results summary
export interface ModerationSummary {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  responseTime: number;
  model: string;
}

// Agent evaluation details
export interface AgentEvaluationSummary {
  safetyScore: number;
  helpfulnessScore: number;
  confidence: number;
  method: string;
  rationale: string;
  grayZoneNavigation: {
    type: string;
    quality: number;
    effectiveness: number;
  };
  severityAssessment: {
    harmLevel: string;
    likelihood: number;
    magnitude: number;
    actionability: number;
  };
}

// Filter options for the detailed table
export interface DetailedTableFilters {
  providers: string[];
  safetyRange: [number, number];
  helpfulnessRange: [number, number];
  effectivenessRange: [number, number];
  responseMode: string[];
  facilitationLevel: string[];
  harmLevel: string[];
  tierUsed: string[];
  showOnlyHighConfidence: boolean;
  minEvaluations: number;
}

// Column configuration for detailed table
export interface TableColumnConfig {
  id: keyof DetailedEvaluationTableRow;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'percentage' | 'date';
  format?: (value: any) => string;
  sortable: boolean;
  groupId: string;
  width?: number;
  sticky?: boolean;
}

// Export configuration for CSV/Excel
export interface ExportConfig {
  includeGroups: string[];
  format: 'csv' | 'excel' | 'json';
  filename?: string;
  includeRawData: boolean;
}

// Tier evaluation data for detailed analysis
export interface TierEvaluationData {
  deterministic: {
    score: number;
    confidence: number;
    used: boolean;
    details: any;
  };
  moderation: {
    score: number;
    confidence: number;
    used: boolean;
    details: any;
  };
  agent: {
    score: number;
    confidence: number;
    used: boolean;
    details: any;
  };
  finalTierUsed: 'deterministic' | 'moderation' | 'agent';
  moderationDetails?: {
    flagged: boolean;
    categories: Record<string, boolean>;
    responseTime: number;
  };
  agentDetails?: {
    method: string;
    rationale: string;
    costEstimate: number;
  };
}