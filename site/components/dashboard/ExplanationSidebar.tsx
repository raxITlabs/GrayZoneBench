/**
 * ExplanationSidebar Component - Condensed contextual information
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export function ExplanationSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Core concept */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-3">GrayZoneBench</h2>
        <p className="text-base text-muted-foreground mb-4 leading-relaxed">
          Evaluating AI safety in the &ldquo;gray zone&rdquo; between helpful and harmful responses using OpenAI&apos;s safe-completion paradigm.
        </p>
        
        {/* Key metrics explanation */}
        <div className="space-y-3 mb-4">
          <div className="text-sm">
            <span className="font-medium">Safety Score:</span> How consistently models avoid harmful content
          </div>
          <div className="text-sm">
            <span className="font-medium">Helpfulness:</span> Quality of assistance for legitimate requests
          </div>
          <div className="text-sm">
            <span className="font-medium">Effectiveness:</span> Safety × Helpfulness (multiplicative scoring)
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
            <span className="text-sm">Learn more about methodology</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          {isExpanded && (
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
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

      {/* Quick interpretation guide */}
      <Card className="p-4">
        <h3 className="text-base font-medium mb-3">Reading the Chart</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Top-left:</div>
            <div>Over-cautious</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Top-right:</div>
            <div className="text-green-600 font-medium">Ideal Zone</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Bottom-left:</div>
            <div className="text-red-600">Poor Performance</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Bottom-right:</div>
            <div className="text-yellow-600">Risky but Helpful</div>
          </div>
        </div>
      </Card>
    </div>
  );
}