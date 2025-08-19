/**
 * EvaluationTierViewer Component - Shows the three-tier evaluation progression
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator,
  Shield,
  Brain,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react';
import { 
  getScoreColorClass, 
  getTierBadgeProps, 
  formatScore 
} from '@/lib/utils';

interface TierResult {
  score: number;
  confidence: number;
  used: boolean;
  details?: any;
}

interface EvaluationTierViewerProps {
  deterministicTier: TierResult;
  moderationTier: TierResult;
  agentTier: TierResult;
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

export function EvaluationTierViewer({
  deterministicTier,
  moderationTier,
  agentTier,
  finalTierUsed,
  moderationDetails,
  agentDetails
}: EvaluationTierViewerProps) {

  
  const getTierIcon = (tier: 'deterministic' | 'moderation' | 'agent', isActive: boolean) => {
    const className = `w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`;
    switch (tier) {
      case 'deterministic': return <Calculator className={className} />;
      case 'moderation': return <Shield className={className} />;
      case 'agent': return <Brain className={className} />;
    }
  };

  const getTierStatus = (used: boolean, tier: string) => {
    if (!used) return { icon: <div className="w-4 h-4" />, text: 'Skipped', color: 'text-muted-foreground' };
    if (tier === finalTierUsed) return { icon: <CheckCircle className="w-4 h-4 text-chart-1" />, text: 'Final Decision', color: 'text-chart-1' };
    return { icon: <ArrowRight className="w-4 h-4 text-foreground" />, text: 'Escalated', color: 'text-foreground' };
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-foreground" />
        <h4 className="font-semibold">Three-Tier Evaluation Process</h4>
        <Badge variant="outline" className="ml-auto">
          Final: {finalTierUsed}
        </Badge>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-4">
        
        {/* Deterministic Tier */}
        <Card className={`${finalTierUsed === 'deterministic' ? 'border-chart-1 bg-chart-1/10' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getTierIcon('deterministic', deterministicTier.used)}
              <span>1. Deterministic Analysis</span>
              {getTierStatus(deterministicTier.used, 'deterministic').icon}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score</span>
              <span className={`font-mono font-semibold ${getScoreColorClass(deterministicTier.score, { high: 0.7, medium: 0.5 })}`}>
                {formatScore(deterministicTier.score)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <span className="font-mono text-sm">
                {formatScore(deterministicTier.confidence)}
              </span>
            </div>
            <Progress value={deterministicTier.score * 100} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              <span className={getTierStatus(deterministicTier.used, 'deterministic').color}>
                {getTierStatus(deterministicTier.used, 'deterministic').text}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Arrow if escalated */}
        {deterministicTier.used && finalTierUsed !== 'deterministic' && (
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Moderation Tier */}
        <Card className={`${finalTierUsed === 'moderation' ? 'border-chart-1 bg-chart-1/10' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getTierIcon('moderation', moderationTier.used)}
              <span>2. Moderation API</span>
              {getTierStatus(moderationTier.used, 'moderation').icon}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score</span>
              <span className={`font-mono font-semibold ${getScoreColorClass(moderationTier.score, { high: 0.7, medium: 0.5 })}`}>
                {formatScore(moderationTier.score)}
              </span>
            </div>
            
            {moderationDetails && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Flagged</span>
                  <Badge variant={moderationDetails.flagged ? 'destructive' : 'secondary'}>
                    {moderationDetails.flagged ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                {moderationDetails.flagged && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Flagged Categories:</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(moderationDetails.categories)
                        .filter(([, flagged]) => flagged)
                        .map(([category]) => (
                          <Badge key={category} variant="destructive" className="text-xs">
                            {category.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Response: {moderationDetails.responseTime.toFixed(2)}s
                </div>
              </>
            )}

            <Progress value={moderationTier.score * 100} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              <span className={getTierStatus(moderationTier.used, 'moderation').color}>
                {getTierStatus(moderationTier.used, 'moderation').text}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Arrow if escalated to agent */}
        {moderationTier.used && finalTierUsed === 'agent' && (
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Agent Tier */}
        <Card className={`${finalTierUsed === 'agent' ? 'border-chart-1 bg-chart-1/10' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getTierIcon('agent', agentTier.used)}
              <span>3. Agent Analysis</span>
              {getTierStatus(agentTier.used, 'agent').icon}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score</span>
              <span className={`font-mono font-semibold ${getScoreColorClass(agentTier.score, { high: 0.7, medium: 0.5 })}`}>
                {formatScore(agentTier.score)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <span className="font-mono text-sm">
                {formatScore(agentTier.confidence)}
              </span>
            </div>

            {agentDetails && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Method</span>
                  <Badge variant="outline" className="text-xs">
                    {agentDetails.method}
                  </Badge>
                </div>
                
                {agentDetails.costEstimate > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Est. Cost</span>
                    <span>${agentDetails.costEstimate.toFixed(4)}</span>
                  </div>
                )}
              </>
            )}

            <Progress value={agentTier.score * 100} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              <span className={getTierStatus(agentTier.used, 'agent').color}>
                {getTierStatus(agentTier.used, 'agent').text}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-chart-1" />
          <span className="font-medium text-sm">Evaluation Summary</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Final decision made by <strong>{finalTierUsed}</strong> tier with {' '}
          <strong className={getScoreColorClass(
            finalTierUsed === 'deterministic' ? deterministicTier.score :
            finalTierUsed === 'moderation' ? moderationTier.score :
            agentTier.score,
            { high: 0.7, medium: 0.5 }
          )}>
            {formatScore(
              finalTierUsed === 'deterministic' ? deterministicTier.score :
              finalTierUsed === 'moderation' ? moderationTier.score :
              agentTier.score
            )}
          </strong> score.
        </p>
      </div>
    </div>
  );
}