/**
 * RationaleFormatter Component - Formats complex evaluation rationales for readable display
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Shield, 
  Target,
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  getEffectivenessColorClass, 
  getHarmLevelBadgeProps,
  getResponseModeBadgeProps 
} from '@/lib/utils';

interface RationaleFormatterProps {
  rationale: string;
  type: 'safety' | 'helpfulness';
  compact?: boolean;
}

interface ParsedRationale {
  effectiveness: string;
  responseMode: string;
  modeQuality: string;
  grayZoneType: string;
  harmLevel: string;
  execution: string;
}

export function RationaleFormatter({ 
  rationale, 
  type, 
  compact = false 
}: RationaleFormatterProps) {
  
  // Parse the complex rationale string
  const parseRationale = (text: string): ParsedRationale => {
    // Extract key components using regex patterns
    const effectivenessMatch = text.match(/(poor|fair|good|excellent) gray zone navigation/i);
    const responseModeMatch = text.match(/Mode: ([^|]+)/i);
    const modeQualityMatch = text.match(/([^;]+); ([^;]+); ([^|]+)/);
    const grayZoneMatch = text.match(/Gray zone: ([^|]+)/i);
    const harmLevelMatch = text.match(/Harm level: (\w+)/i);
    const executionMatch = text.match(/(poor|fair|good|excellent) execution/i);

    return {
      effectiveness: effectivenessMatch?.[1] || 'unknown',
      responseMode: responseModeMatch?.[1]?.trim() || 'unknown',
      modeQuality: modeQualityMatch?.[1]?.trim() || '',
      grayZoneType: grayZoneMatch?.[1]?.trim() || 'unknown',
      harmLevel: harmLevelMatch?.[1] || 'unknown',
      execution: executionMatch?.[1] || 'unknown'
    };
  };

  const parsed = parseRationale(rationale);

  const getEffectivenessIcon = (effectiveness: string) => {
    switch (effectiveness.toLowerCase()) {
      case 'excellent': 
      case 'good': 
        return <CheckCircle className="w-4 h-4 text-chart-1" />;
      case 'fair': 
        return <AlertCircle className="w-4 h-4 text-foreground" />;
      case 'poor': 
        return <XCircle className="w-4 h-4 text-destructive" />;
      default: 
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getResponseModeIcon = (mode: string) => {
    if (mode.includes('refusal')) return <Shield className="w-4 h-4" />;
    if (mode.includes('completion')) return <Target className="w-4 h-4" />;
    return <Brain className="w-4 h-4" />;
  };


  if (compact) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          {getEffectivenessIcon(parsed.effectiveness)}
          <span className={`font-medium capitalize ${getEffectivenessColorClass(parsed.effectiveness)}`}>
            {parsed.effectiveness} navigation
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(() => {
            const badgeProps = getResponseModeBadgeProps(parsed.responseMode);
            return (
              <Badge variant={badgeProps.variant} className={`text-xs ${badgeProps.className}`}>
                {badgeProps.formattedMode}
              </Badge>
            );
          })()}
          {(() => {
            const harmBadgeProps = getHarmLevelBadgeProps(parsed.harmLevel);
            return (
              <Badge variant={harmBadgeProps.variant} className={`text-xs ${harmBadgeProps.className}`}>
                {parsed.harmLevel} harm
              </Badge>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-2">
        {type === 'safety' ? (
          <Shield className="w-5 h-5 text-foreground" />
        ) : (
          <Target className="w-5 h-5 text-chart-1" />
        )}
        <h4 className="font-semibold capitalize">{type} Analysis</h4>
      </div>

      <Separator />

      {/* Effectiveness Assessment */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {getEffectivenessIcon(parsed.effectiveness)}
          <span className="font-medium text-sm">Gray Zone Navigation</span>
        </div>
        <p className={`text-sm capitalize font-medium ${getEffectivenessColorClass(parsed.effectiveness)}`}>
          {parsed.effectiveness} effectiveness
        </p>
        {parsed.modeQuality && (
          <p className="text-sm text-muted-foreground">
            {parsed.modeQuality}
          </p>
        )}
      </div>

      <Separator />

      {/* Response Mode Analysis */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {getResponseModeIcon(parsed.responseMode)}
          <span className="font-medium text-sm">Response Mode</span>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const badgeProps = getResponseModeBadgeProps(parsed.responseMode);
            return (
              <Badge variant={badgeProps.variant} className={`text-sm ${badgeProps.className}`}>
                {badgeProps.formattedMode}
              </Badge>
            );
          })()}
          <span className="text-sm text-muted-foreground">
            {parsed.execution} execution
          </span>
        </div>
      </div>

      <Separator />

      {/* Risk Assessment */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-foreground" />
          <span className="font-medium text-sm">Risk Assessment</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm">
            {parsed.grayZoneType}
          </Badge>
          {(() => {
            const harmBadgeProps = getHarmLevelBadgeProps(parsed.harmLevel);
            return (
              <Badge variant={harmBadgeProps.variant} className={`text-sm ${harmBadgeProps.className}`}>
                {parsed.harmLevel} harm
              </Badge>
            );
          })()}
        </div>
      </div>

      {/* Full rationale (collapsed by default) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          View full rationale
        </summary>
        <div className="mt-2 p-3 bg-background rounded border text-sm font-mono">
          {rationale}
        </div>
      </details>
    </div>
  );
}