/**
 * DataExplanation Component - Explains the methodology and data sources
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, ExternalLink, Database, Shield, Target, Calculator } from 'lucide-react';

export function DataExplanation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          About This Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* What we measure */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            What We Measure
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            GrayZoneBench evaluates AI models on ambiguous prompts that exist in the &ldquo;gray zone&rdquo; 
            between clearly safe and clearly harmful requests. This tests how well models can 
            navigate nuanced scenarios while remaining both helpful and safe.
          </p>
        </div>

        {/* Methodology */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Three-Tier Evaluation System
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">1. Deterministic Rules</div>
              <div className="text-muted-foreground text-xs">
                Pattern matching for refusal phrases, alternatives, and basic safety markers
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">2. Moderation API</div>
              <div className="text-muted-foreground text-xs">
                OpenAI&apos;s content policy validation for consistency checking
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">3. Agent Analysis</div>
              <div className="text-muted-foreground text-xs">
                Advanced AI evaluation for gray zone navigation quality
              </div>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Scoring System
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Badge 
                variant="outline" 
                className="mb-2 border-border"
                style={{ color: 'var(--chart-1)', borderColor: 'var(--chart-1)' }}
              >
                Safety Score (0-1)
              </Badge>
              <p className="text-muted-foreground text-xs">
                How well the model avoids harmful outputs while handling ambiguous requests appropriately
              </p>
            </div>
            <div>
              <Badge 
                variant="outline" 
                className="mb-2 border-border"
                style={{ color: 'var(--chart-2)', borderColor: 'var(--chart-2)' }}
              >
                Helpfulness (0-1)
              </Badge>
              <p className="text-muted-foreground text-xs">
                How useful and informative the response is to users with legitimate needs
              </p>
            </div>
            <div>
              <Badge 
                variant="outline" 
                className="mb-2 border-border"
                style={{ color: 'var(--chart-3)', borderColor: 'var(--chart-3)' }}
              >
                Effectiveness
              </Badge>
              <p className="text-muted-foreground text-xs">
                Safety × Helpfulness (multiplicative scoring following OpenAI&apos;s approach)
              </p>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Sources & Updates
          </h3>
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Storage:</strong> Results aggregated from Google Cloud Storage where 
                evaluation runs are automatically uploaded
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Updates:</strong> Daily automated evaluations with new models and prompts
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div>
                <strong>Benchmark:</strong> Based on OpenAI&apos;s safe-completion research paradigm
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <a 
              href="https://docs.anthropic.com/en/docs/claude-code" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Research Paper
            </a>
            <a 
              href="/docs" 
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Documentation
            </a>
            <a 
              href="https://github.com/anthropics/claude-code" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Source Code
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Note:</strong> Results are for research purposes and may not reflect real-world performance. 
          Model capabilities can vary significantly with different prompts, contexts, and use cases.
        </div>
      </CardContent>
    </Card>
  );
}