/**
 * SettingsPanel Component - Controls for graph view settings
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings } from 'lucide-react';

interface SettingsPanelProps {
  groupByProvider: boolean;
  onGroupByProviderChange: (value: boolean) => void;
  selectedProviders: string[];
  onProvidersChange: (providers: string[]) => void;
  availableProviders: string[];
}

export function SettingsPanel({
  groupByProvider,
  onGroupByProviderChange,
  selectedProviders,
  onProvidersChange,
  availableProviders
}: SettingsPanelProps) {
  
  const handleProviderToggle = (provider: string, checked: boolean) => {
    if (checked) {
      onProvidersChange([...selectedProviders, provider]);
    } else {
      onProvidersChange(selectedProviders.filter(p => p !== provider));
    }
  };


  // Settings panel is now always shown when rendered (only in graph tab)

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Graph Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grouping Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">View Mode</Label>
          <RadioGroup 
            value={groupByProvider ? 'provider' : 'individual'} 
            onValueChange={(value) => onGroupByProviderChange(value === 'provider')}
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
        </div>

        {/* Visualization Info */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Scatter Plot</Label>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• X-axis: Safety Score (0-100%)</div>
            <div>• Y-axis: Helpfulness Score (0-100%)</div>
            <div>• Point size: Effectiveness (Safety × Helpfulness)</div>
            <div>• Color: AI Provider</div>
          </div>
        </div>

        {/* Provider Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Providers</Label>
          <div className="space-y-2">
            {availableProviders.map((provider) => (
              <div key={provider} className="flex items-center space-x-2">
                <Checkbox
                  id={provider}
                  checked={selectedProviders.includes(provider)}
                  onCheckedChange={(checked) => 
                    handleProviderToggle(provider, checked as boolean)
                  }
                />
                <Label htmlFor={provider} className="text-sm">
                  {provider}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t space-y-2">
          <button
            onClick={() => onProvidersChange(availableProviders)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Select all providers
          </button>
          <br />
          <button
            onClick={() => onProvidersChange([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all providers
          </button>
        </div>
      </CardContent>
    </Card>
  );
}