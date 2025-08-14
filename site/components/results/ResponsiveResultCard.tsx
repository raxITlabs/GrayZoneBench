/**
 * Responsive Model Result Card with Three-Tier Evaluation Breakdown
 * WCAG AAA compliant with mobile-first design
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  Settings, 
  Brain, 
  Eye,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CompleteModelResult } from '@/types/evaluation';

interface ResponsiveResultCardProps {
  result: CompleteModelResult;
  onSelect?: (result: CompleteModelResult) => void;
  isSelected?: boolean;
  className?: string;
}

export function ResponsiveResultCard({ 
  result, 
  onSelect, 
  isSelected = false, 
  className = '' 
}: ResponsiveResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'response' | 'breakdown' | 'summary'>('response');

  const judge = result.judge;
  const safetyScores = judge.safety_raw.final_scores;
  const helpfulnessScores = judge.helpfulness_raw.final_scores;
  const deterministic = judge.safety_raw.deterministic_features;
  const grayZone = judge.safety_raw.gray_zone_navigation;

  // Helper functions
  const getSafetyBadge = () => {
    const score = safetyScores.safety;
    if (score > 0.7) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">SAFE</Badge>;
    } else if (score > 0.4) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">CAUTION</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-200">UNSAFE</Badge>;
    }
  };

  const getResponseModeColor = (mode: string) => {
    switch (mode) {
      case 'constructive-refusal': return 'bg-chart-1 text-primary-foreground';
      case 'safe-completion': return 'bg-chart-2 text-secondary-foreground';
      case 'direct-answer': return 'bg-chart-3 text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getGrayZoneTypeColor = (type: string) => {
    switch (type) {
      case 'clear-harmful': return 'text-destructive';
      case 'clear-safe': return 'text-chart-1';
      case 'ambiguous-dual-use': return 'text-chart-4';
      case 'contextual': return 'text-chart-2';
      default: return 'text-muted-foreground';
    }
  };

  const effectiveness = safetyScores.safety * helpfulnessScores.helpfulness;

  return (
    <Card 
      className={`
        w-full transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-ring ring-offset-2' : ''}
        ${className}
      `}
      role="article"
      aria-labelledby={`result-${result.model}-${result.rowId}-title`}
    >
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 
              id={`result-${result.model}-${result.rowId}-title`}
              className="font-semibold text-base truncate"
            >
              {result.model}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {result.category} • {result.rowId}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {getSafetyBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect?.(result)}
              aria-label={`Select ${result.model} for detailed view`}
              className="min-h-[44px] px-4"
            >
              <Eye className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>
        </div>
        
        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Safety</p>
            <p className={`text-lg font-bold ${safetyScores.safety > 0.7 ? 'text-chart-1' : safetyScores.safety > 0.4 ? 'text-yellow-600' : 'text-destructive'}`}>
              {(safetyScores.safety * 100).toFixed(0)}%
            </p>
            <Progress 
              value={safetyScores.safety * 100} 
              className="mt-1 h-1.5" 
              aria-label={`Safety score: ${(safetyScores.safety * 100).toFixed(1)}%`}
            />
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Helpfulness</p>
            <p className={`text-lg font-bold ${helpfulnessScores.helpfulness > 0.7 ? 'text-chart-3' : 'text-muted-foreground'}`}>
              {(helpfulnessScores.helpfulness * 100).toFixed(0)}%
            </p>
            <Progress 
              value={helpfulnessScores.helpfulness * 100} 
              className="mt-1 h-1.5" 
              aria-label={`Helpfulness score: ${(helpfulnessScores.helpfulness * 100).toFixed(1)}%`}
            />
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Effectiveness</p>
            <p className={`text-lg font-bold ${effectiveness > 0.6 ? 'text-chart-4' : 'text-muted-foreground'}`}>
              {(effectiveness * 100).toFixed(0)}%
            </p>
            <Progress 
              value={effectiveness * 100} 
              className="mt-1 h-1.5" 
              aria-label={`Effectiveness score: ${(effectiveness * 100).toFixed(1)}%`}
            />
          </div>
        </div>
        
        {/* Response Mode and Gray Zone Type */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge 
            className={getResponseModeColor(deterministic.response_mode)}
          >
            {deterministic.response_mode.replace('-', ' ')}
          </Badge>
          <Badge 
            variant="outline" 
            className={getGrayZoneTypeColor(grayZone.gray_zone_type)}
          >
            {grayZone.gray_zone_type.replace('-', ' ')}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {deterministic.confidence > 0.8 ? 'High' : deterministic.confidence > 0.5 ? 'Med' : 'Low'} Confidence
          </Badge>
        </div>
      </CardHeader>
      
      {/* Expandable Section */}
      <CardContent className="pt-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-center p-2 h-auto min-h-[44px]"
          aria-expanded={isExpanded}
          aria-controls={`result-${result.model}-${result.rowId}-details`}
          aria-label={isExpanded ? 'Hide details' : 'Show details'}
        >
          <span className="mr-2">
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              id={`result-${result.model}-${result.rowId}-details`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                <Separator className="mb-4" />
                
                {/* Tab Navigation */}
                <div 
                  role="tablist" 
                  className="flex gap-1 mb-4 bg-muted p-1 rounded-md"
                  aria-label="Result details tabs"
                >
                  <button
                    role="tab"
                    tabIndex={activeTab === 'response' ? 0 : -1}
                    aria-selected={activeTab === 'response'}
                    aria-controls="response-panel"
                    className={`
                      flex-1 px-3 py-2 text-sm font-medium rounded transition-colors
                      min-h-[44px] flex items-center justify-center gap-2
                      ${activeTab === 'response' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                    onClick={() => setActiveTab('response')}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Response</span>
                  </button>
                  
                  <button
                    role="tab"
                    tabIndex={activeTab === 'breakdown' ? 0 : -1}
                    aria-selected={activeTab === 'breakdown'}
                    aria-controls="breakdown-panel"
                    className={`
                      flex-1 px-3 py-2 text-sm font-medium rounded transition-colors
                      min-h-[44px] flex items-center justify-center gap-2
                      ${activeTab === 'breakdown' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                    onClick={() => setActiveTab('breakdown')}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Breakdown</span>
                  </button>
                  
                  <button
                    role="tab"
                    tabIndex={activeTab === 'summary' ? 0 : -1}
                    aria-selected={activeTab === 'summary'}
                    aria-controls="summary-panel"
                    className={`
                      flex-1 px-3 py-2 text-sm font-medium rounded transition-colors
                      min-h-[44px] flex items-center justify-center gap-2
                      ${activeTab === 'summary' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                    onClick={() => setActiveTab('summary')}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Summary</span>
                  </button>
                </div>
                
                {/* Tab Content */}
                <div className="min-h-[200px]">
                  {/* Response Tab */}
                  {activeTab === 'response' && (
                    <div 
                      id="response-panel" 
                      role="tabpanel" 
                      aria-labelledby="response-tab"
                      className="space-y-4"
                    >
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Prompt
                        </h4>
                        <div className="bg-muted/50 p-3 rounded text-sm border">
                          {result.prompt}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Response</h4>
                        <div className="bg-background p-3 rounded text-sm border max-h-40 overflow-y-auto">
                          {result.response.content}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Breakdown Tab */}
                  {activeTab === 'breakdown' && (
                    <div 
                      id="breakdown-panel" 
                      role="tabpanel" 
                      aria-labelledby="breakdown-tab"
                      className="space-y-4"
                    >
                      {/* Three-Tier Visualization */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded border bg-chart-1/10 border-chart-1/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-4 h-4 text-chart-1" />
                            <h5 className="font-medium text-sm">Deterministic</h5>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Score: {(deterministic.safety_score * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Patterns: {deterministic.refusal_patterns.length}
                          </p>
                        </div>
                        
                        <div className="p-3 rounded border bg-chart-5/10 border-chart-5/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-chart-5" />
                            <h5 className="font-medium text-sm">Moderation</h5>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            API-based filtering
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: Applied
                          </p>
                        </div>
                        
                        <div className="p-3 rounded border bg-chart-2/10 border-chart-2/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-chart-2" />
                            <h5 className="font-medium text-sm">Agent</h5>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Quality: {(grayZone.navigation_quality * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Level: {grayZone.actionability_level.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Detailed Metrics */}
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-2">Response Analysis</h5>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Token Count:</span>
                              <span className="ml-1 font-mono">{deterministic.token_count}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actionability:</span>
                              <span className="ml-1 font-mono">{deterministic.actionability_score.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Alternatives:</span>
                              <span className="ml-1">{deterministic.alternatives_provided ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Education:</span>
                              <span className="ml-1">{deterministic.education_provided ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-2">Facilitation Assessment</h5>
                          <div className="text-xs">
                            <p>
                              <span className="text-muted-foreground">Level:</span>
                              <span className="ml-1 capitalize">{deterministic.meaningful_facilitation.facilitation_level}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Score:</span>
                              <span className="ml-1 font-mono">{(deterministic.meaningful_facilitation.meaningful_facilitation_score * 100).toFixed(1)}%</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Threshold:</span>
                              <span className="ml-1">{deterministic.meaningful_facilitation.crosses_facilitation_threshold ? 'Crossed' : 'Not Crossed'}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Summary Tab */}
                  {activeTab === 'summary' && (
                    <div 
                      id="summary-panel" 
                      role="tabpanel" 
                      aria-labelledby="summary-tab"
                      className="space-y-4"
                    >
                      <div className="prose prose-sm max-w-none">
                        <div className="bg-muted/50 p-3 rounded text-sm border max-h-60 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans text-xs">
                            {result.summary}
                          </pre>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <h5 className="font-medium text-sm mb-2">Evaluation Rationale</h5>
                        <div className="text-xs space-y-2">
                          <div>
                            <p className="font-medium">Safety:</p>
                            <p className="text-muted-foreground">{judge.safety_raw.rationale}</p>
                          </div>
                          <div>
                            <p className="font-medium">Helpfulness:</p>
                            <p className="text-muted-foreground">{judge.helpfulness_raw.rationale}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}