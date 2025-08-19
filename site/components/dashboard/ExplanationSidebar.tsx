/**
 * ExplanationSidebar Component - Condensed contextual information
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DynamicReadingGuide } from '@/components/dashboard/DynamicReadingGuide';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';

interface ExplanationSidebarProps {
  activeTab?: 'graph' | 'table';
  modelData?: Record<string, ModelData>;
  metadata?: BenchmarkMetadata | null;
}

export function ExplanationSidebar({
  activeTab = 'graph',
  modelData = {},
  metadata = null
}: ExplanationSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* Core concept */}
      <Card className="p-4 lg:p-4">
        {/* <h2 className="text-xl font-semibold mb-3">GrayZoneBench</h2> */}
        <p className="text-base text-foreground mb-4 leading-relaxed">
          We test how well AI models handle tricky requests that aren&apos;t clearly good or bad using real scenarios where safety and helpfulness both matter.
        </p>
        
        {/* Key metrics explanation */}
        <div className="space-y-3 mb-4">
          <div className="text-base">
            <span className="font-medium text-foreground">Safety Score:</span> How well models refuse risky requests while staying helpful
          </div>
          <div className="text-base">
            <span className="font-medium text-foreground">Helpfulness:</span> How useful responses are when the request is good
          </div>
          <div className="text-base">
            <span className="font-medium">Effectiveness:</span> The sweet spot where safety meets usefulness
          </div>
        </div>

        {/* Expandable details */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between p-2 h-auto"
          >
            <span className="text-sm text-foreground">Learn more about methodology</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          {isExpanded && (
            <div className="space-y-3 text-base text-foreground leading-relaxed">
              <p>
                When OpenAI announced GPT-5, they highlighted &ldquo;safe completion&rdquo;&mdash;models assess user intent rather than bluntly refusing requests. This caught our attention in nuanced &ldquo;gray areas,&rdquo; especially with dual-use scenarios.
              </p>
              <p>
                Since there was no public benchmark comparing this approach across providers, we created GrayZoneBench to measure both helpfulness and safety of responses.
              </p>
              
              {/* External links */}
              <div className="space-y-1 pt-2 border-t">
                <a 
                  href="https://github.com/raxITlabs/GrayZoneBench/blob/main/docs/how-it-works.md" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  How It Works <ExternalLink className="w-4 h-4" />
                </a>
                <a 
                  href="https://github.com/raxITlabs/GrayZoneBench/blob/main/docs/understanding-results.md" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  Understanding Results <ExternalLink className="w-4 h-4" />
                </a>
                <a 
                  href="https://huggingface.co/datasets/raxITLabs/GrayZone" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  Dataset on HF <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Dynamic interpretation guide */}
      <DynamicReadingGuide 
        activeTab={activeTab}
        modelData={modelData}
        metadata={metadata}
      />
    </div>
  );
}