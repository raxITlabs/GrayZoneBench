/**
 * TypeScript type definitions for GrayZoneBench evaluation system
 */

// Core evaluation data structures based on your provided JSON examples
export interface DeterministicFeatures {
  token_count: number;
  character_count: number;
  sentence_count: number;
  word_count: number;
  refusal_patterns: string[];
  refusal_confidence: number;
  starts_with_refusal: boolean;
  alternatives_provided: boolean;
  explanation_provided: boolean;
  education_provided: boolean;
  information_density: number;
  actionability_score: number;
  dual_use_detected: boolean;
  dual_use_signals: string[];
  gray_zone_detected: boolean;
  gray_zone_signals: string[];
  response_mode: 'constructive-refusal' | 'direct-answer' | 'safe-completion';
  response_mode_confidence: number;
  mode_indicators: string[];
  meaningful_facilitation: {
    meaningful_facilitation_score: number;
    facilitation_level: 'negligible' | 'low' | 'moderate' | 'high' | 'severe';
    detected_domains: string[];
    facilitation_indicators: string[];
    actionability_component: number;
    crosses_facilitation_threshold: boolean;
  };
  safety_score: number;
  helpfulness_score: number;
  confidence: number;
}

export interface SafetyAnalysis {
  meaningful_facilitation: {
    score: number;
    reasoning: string;
  };
  gray_zone_navigation: {
    score: number;
    reasoning: string;
  };
  response_mode_quality: {
    score: number;
    reasoning: string;
  };
  safe_completion_effectiveness: {
    score: number;
    reasoning: string;
  };
}

export interface HelpfulnessAnalysis {
  safe_completion_helpfulness: {
    score: number;
    reasoning: string;
  };
  constructive_value: {
    score: number;
    reasoning: string;
  };
  educational_effectiveness: {
    score: number;
    reasoning: string;
  };
  gray_zone_balance: {
    score: number;
    reasoning: string;
  };
}

export interface GrayZoneNavigation {
  gray_zone_type: 'clear-harmful' | 'clear-safe' | 'ambiguous-dual-use' | 'contextual';
  response_mode: 'constructive-refusal' | 'direct-answer' | 'safe-completion';
  navigation_quality: number;
  actionability_level: number;
  safe_completion_effectiveness: number;
  reasoning: string;
}

export interface SeverityAssessment {
  harm_level: 'negligible' | 'low' | 'moderate' | 'high' | 'severe';
  likelihood: number;
  magnitude: number;
  actionability: number;
  reasoning: string;
}

export interface ModeEvaluation {
  response_mode: string;
  mode_quality_score: number;
  mode_appropriateness: number;
  overall_mode_effectiveness: number;
  gray_zone_type: string;
  rationale: string;
}

export interface BreakdownScore {
  refusal_calibration: number;
  actionability_penalty: number;
  alternative_bonus: number;
  educational_value: number;
  dual_use_handling: number;
  final_score: number;
  level: string;
  rationale: string;
}

export interface GrayZoneResult {
  safety_score: number;
  helpfulness_score: number;
  gray_zone_effectiveness: number;
  effectiveness_level: 'poor' | 'fair' | 'good' | 'excellent';
  response_mode: string;
  mode_evaluation: ModeEvaluation;
  rationale: string;
  safety_breakdown: BreakdownScore;
  helpfulness_breakdown: BreakdownScore;
}

export interface ConsensusResult {
  gray_zone_result: GrayZoneResult;
  method: string;
  agents_used: string[];
}

export interface FinalScores {
  safety: number;
  helpfulness: number;
  gray_zone_effectiveness: number;
}

// Three-tier evaluation structure
export interface ThreeTierEvaluation {
  safety_raw: {
    prompt: string;
    response: string;
    category: string;
    deterministic_features: DeterministicFeatures;
    safety_analysis: SafetyAnalysis;
    helpfulness_analysis: HelpfulnessAnalysis;
    gray_zone_navigation: GrayZoneNavigation;
    severity_assessment: SeverityAssessment;
    consensus_result: ConsensusResult;
    final_scores: FinalScores;
    rationale: string;
    cost_estimate: number;
  };
  helpfulness_raw: {
    prompt: string;
    response: string;
    category?: string;
    deterministic_features: DeterministicFeatures;
    safety_analysis: SafetyAnalysis;
    helpfulness_analysis: HelpfulnessAnalysis;
    gray_zone_navigation: GrayZoneNavigation;
    severity_assessment: SeverityAssessment;
    consensus_result: ConsensusResult;
    final_scores: FinalScores;
    rationale: string;
    cost_estimate: number;
  };
}

// Model response data
export interface ModelResponse {
  content: string;
  additional_kwargs: Record<string, any>;
  response_metadata: {
    ResponseMetadata: {
      RequestId: string;
      HTTPStatusCode: number;
      HTTPHeaders: Record<string, string>;
      RetryAttempts: number;
    };
    stopReason: string;
    metrics?: {
      latencyMs: number[];
    };
    model_name: string;
  };
  type: string;
  name: string | null;
  id: string;
  example: boolean;
  tool_calls: any[];
  invalid_tool_calls: any[];
  usage_metadata: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_token_details: {
      cache_creation: number;
      cache_read: number;
    };
  };
}

// New smart merge result structure from GCS
export interface SmartMergeResult {
  hf_index: number;
  category: string;
  model: string;
  status: 'ok' | 'error' | 'api_blocked';
  verdict: string | null;
  safety: string;
  helpfulness: number;
  input_tokens: number;
  output_tokens: number;
  detailed_safety_score: number;
  detailed_helpfulness_score: number;
  safety_confidence: number;
  helpfulness_confidence: number;
  safety_rationale: string;
  helpfulness_rationale: string;
  safety_tier_results: any;
  helpfulness_tier_results: any;
  timestamp: string;
}

// Metadata structure from GCS latest/metadata.json
export interface BenchmarkMetadata {
  last_updated: string;
  models_tested: string[];
  total_prompts: number;
  last_run_models: string[];
  models_info: {
    [model: string]: {
      total_prompts: number;
      avg_safety: number;
      avg_helpfulness: number;
      safe_count: number;
      unsafe_count: number;
      total_tokens: number;
      last_updated: string;
      provider: string;
      file_size_kb: number;
    };
  };
}

// Model-specific data structure from GCS latest/models/{model}.json
export interface ModelData {
  model: string;
  last_updated: string;
  stats: {
    total_prompts: number;
    avg_safety: number;
    avg_helpfulness: number;
    safe_count: number;
    unsafe_count: number;
    total_tokens: number;
    last_updated: string;
  };
  results: {
    [promptId: string]: SmartMergeResult;
  };
}

// Latest results structure from GCS latest/results.json (legacy - keeping for backward compatibility)
export interface LatestResults {
  metadata: {
    last_updated: string;
    models_tested: string[];
    total_prompts: number;
    last_run_models: string[];
  };
  results: {
    [promptId: string]: {
      [model: string]: SmartMergeResult;
    };
  };
}

// Complete model result with all files (legacy structure for detailed views)
export interface CompleteModelResult {
  model: string;
  rowId: string;
  prompt: string;
  response: ModelResponse;
  judge: ThreeTierEvaluation;
  summary: string; // Markdown content
  category: string;
  timestamp: string;
  status: 'ok' | 'error';
}

// Run information
export interface RunInfo {
  timestamp: string;
  models: string[];
  num_prompts: number;
  uploaded_at?: string;
  config?: {
    dataset: string;
    judge_model: string;
    task_type: string;
  };
}

export interface RunsList {
  runs: RunInfo[];
  total: number;
  updated_at: string;
}

// Enhanced model statistics (updated for smart merge)
export interface ModelStats {
  model: string;
  totalPrompts: number;
  avgSafety: number;
  avgHelpfulness: number;
  effectiveness: number;
  safeCount: number;
  unsafeCount: number;
  avgConfidence: number;
  avgTokens: number;
  lastUpdated: string;
  categories: {
    [category: string]: {
      count: number;
      avgSafety: number;
      avgHelpfulness: number;
    };
  };
}

// Visualization data structures
export interface EvaluationNode {
  id: string;
  type: 'deterministic' | 'moderation' | 'agent' | 'result';
  position: { x: number; y: number };
  data: {
    label: string;
    score?: number;
    confidence?: number;
    details: any;
    tier: 'deterministic' | 'moderation' | 'agent';
    used: boolean; // Whether this tier was actually used for the final decision
  };
  style?: {
    background?: string;
    border?: string;
    color?: string;
  };
}

export interface EvaluationEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'step' | 'smoothstep';
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
  animated?: boolean;
  data?: {
    used: boolean; // Whether this connection was used
  };
}

export interface EvaluationFlow {
  nodes: EvaluationNode[];
  edges: EvaluationEdge[];
}

// Filter and search interfaces (updated for smart merge)
export interface ResultFilter {
  models?: string[];
  categories?: string[];
  safetyLabels?: string[];
  safetyRange?: [number, number];
  helpfulnessRange?: [number, number];
  effectivenessRange?: [number, number];
  promptIds?: string[];
}

export interface SearchQuery {
  query?: string;
  filters: ResultFilter;
  sortBy: 'timestamp' | 'model' | 'safety' | 'helpfulness' | 'effectiveness';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

// UI State interfaces
export interface ViewMode {
  layout: 'grid' | 'list' | 'table';
  showFilters: boolean;
  selectedRun?: string;
  selectedModels: string[];
  comparisonMode: boolean;
}

export interface LoadingState {
  runs: boolean;
  results: boolean;
  details: boolean;
}

export interface ErrorState {
  runs?: string;
  results?: string;
  details?: string;
}