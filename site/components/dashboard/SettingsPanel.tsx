/**
 * SettingsPanel Component - Controls for graph view settings
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Settings, X, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  groupByProvider: boolean;
  onGroupByProviderChange: (value: boolean) => void;
  selectedProviders: string[];
  onProvidersChange: (providers: string[]) => void;
  availableProviders: string[];
  onClose?: () => void;
  isMobile?: boolean;
}

export function SettingsPanel({
  groupByProvider,
  onGroupByProviderChange,
  selectedProviders,
  onProvidersChange,
  availableProviders,
  onClose,
  isMobile = false
}: SettingsPanelProps) {
  
  // State for collapsible sections
  const [viewModeOpen, setViewModeOpen] = useState(true);
  const [scatterInfoOpen, setScatterInfoOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(true);
  
  const handleProviderToggle = (provider: string, checked: boolean) => {
    if (checked) {
      onProvidersChange([...selectedProviders, provider]);
    } else {
      onProvidersChange(selectedProviders.filter(p => p !== provider));
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background p-4 border-b flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <h3 className="font-semibold text-sm">GRAPH SETTINGS</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* View Mode Section */}
        <Collapsible open={viewModeOpen} onOpenChange={setViewModeOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 rounded-lg transition-colors">
            <span className="text-sm font-medium">View</span>
            {viewModeOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <RadioGroup 
              value={groupByProvider ? 'provider' : 'individual'} 
              onValueChange={(value) => onGroupByProviderChange(value === 'provider')}
              className="space-y-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="text-sm">Show all models</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="provider" id="provider" />
                <Label htmlFor="provider" className="text-sm">Group by provider</Label>
              </div>
            </RadioGroup>
          </CollapsibleContent>
        </Collapsible>

        {/* Graph Info Section */}
        <Collapsible open={scatterInfoOpen} onOpenChange={setScatterInfoOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 rounded-lg transition-colors">
            <span className="text-sm font-medium">Graph</span>
            {scatterInfoOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <div><span className="font-medium">Y Axis:</span> Helpfulness Score (0-100%)</div>
              <div><span className="font-medium">X Axis:</span> Safety Score (0-100%)</div>
              <div className="pt-2 space-y-1">
                <div><span className="font-medium">Point Size:</span> Effectiveness (Safety × Helpfulness)</div>
                <div><span className="font-medium">Color:</span> AI Provider</div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Providers Section */}
        <Collapsible open={providersOpen} onOpenChange={setProvidersOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 rounded-lg transition-colors">
            <span className="text-sm font-medium">Providers</span>
            {providersOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="space-y-2 mt-2">
              {availableProviders.map((provider) => (
                <div key={provider} className="flex items-center space-x-2">
                  <Checkbox
                    id={provider}
                    checked={selectedProviders.includes(provider)}
                    onCheckedChange={(checked) => 
                      handleProviderToggle(provider, checked as boolean)
                    }
                  />
                  <Label htmlFor={provider} className="text-sm cursor-pointer">
                    {provider}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}