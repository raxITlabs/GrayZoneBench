/**
 * GrayZoneBench Dashboard - Simplified Provider Comparison View
 * Inspired by Epoch AI's clean design philosophy
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraphView } from '@/components/dashboard/GraphView';
import { TableView } from '@/components/dashboard/TableView';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { DataExplanation } from '@/components/dashboard/DataExplanation';
import { BenchmarkExplanation } from '@/components/dashboard/BenchmarkExplanation';
import { Shield, BarChart3, Table, Settings, X } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import { getUniqueProvidersFromMetadata } from '@/libs/data-transforms';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [metadata, setMetadata] = useState<BenchmarkMetadata | null>(null);
  const [modelData, setModelData] = useState<Record<string, ModelData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View settings
  const [activeTab, setActiveTab] = useState<'graph' | 'table'>('graph');
  const [groupByProvider, setGroupByProvider] = useState(true);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Check if mobile/tablet
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch metadata
        const metaResponse = await fetch('/api/metadata');
        if (!metaResponse.ok) throw new Error('Failed to fetch metadata');
        const meta = await metaResponse.json();
        setMetadata(meta);
        
        // Extract unique providers from metadata
        const providers = getUniqueProvidersFromMetadata(meta);
        setAvailableProviders(providers);
        
        // Set all providers as selected by default
        setSelectedProviders(providers);
        
        // Fetch model data for each model
        const modelPromises = meta.models_tested.map(async (model: string) => {
          const response = await fetch(`/api/model?model=${encodeURIComponent(model)}`);
          if (!response.ok) return null;
          return { model, data: await response.json() };
        });
        
        const results = await Promise.all(modelPromises);
        const dataMap: Record<string, ModelData> = {};
        
        results.forEach(result => {
          if (result && result.data) {
            dataMap[result.model] = result.data;
          }
        });
        
        setModelData(dataMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">Error loading data</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Shield className="w-8 h-8 text-primary mt-1" />
              <div>
                <h1 className="text-2xl font-bold">GrayZoneBench: AI Safety Evaluation Platform</h1>
                <p className="text-muted-foreground mt-1">
                  Evaluating gray zone navigation across AI providers
                </p>
              </div>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <BenchmarkExplanation />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'graph' | 'table')}>
          <div className="mb-6">
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="graph" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Graph
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                Table
              </TabsTrigger>
            </TabsList>
          </div>

       

          {/* Visualization Area */}
          <div className="mb-6">
            <TabsContent value="graph" className="mt-0">
              <div className="relative overflow-hidden">
                {/* Chart Container with Settings Button */}
                <Card className="relative overflow-hidden">
                  <GraphView
                    metadata={metadata}
                    modelData={modelData}
                    groupByProvider={groupByProvider}
                    selectedProviders={selectedProviders}
                  />
                  
                  {/* Settings Button - Top Right */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-4 right-4 z-10"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Graph Settings
                  </Button>
                </Card>
                
                {/* Desktop: Overlay Settings Panel */}
                {!isMobile && (
                  <div 
                    className={cn(
                      "absolute top-0 right-0 h-[500px] w-80 bg-background border-l shadow-lg transform transition-transform duration-300 z-20",
                      showSettings ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
                    )}
                  >
                    <SettingsPanel
                      groupByProvider={groupByProvider}
                      onGroupByProviderChange={setGroupByProvider}
                      selectedProviders={selectedProviders}
                      onProvidersChange={setSelectedProviders}
                      availableProviders={availableProviders}
                      onClose={() => setShowSettings(false)}
                    />
                  </div>
                )}
              </div>
              
              {/* Mobile: Sheet/Drawer */}
              {isMobile && (
                <Sheet open={showSettings} onOpenChange={setShowSettings}>
                  <SheetContent side="right" className="w-full sm:w-96 p-0">
                    <SettingsPanel
                      groupByProvider={groupByProvider}
                      onGroupByProviderChange={setGroupByProvider}
                      selectedProviders={selectedProviders}
                      onProvidersChange={setSelectedProviders}
                      availableProviders={availableProviders}
                      onClose={() => setShowSettings(false)}
                      isMobile={true}
                    />
                  </SheetContent>
                </Sheet>
              )}
            </TabsContent>
            
            <TabsContent value="table" className="mt-0">
              <Card>
                <TableView
                  metadata={metadata}
                  modelData={modelData}
                  selectedProviders={selectedProviders}
                />
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Data Explanation */}
        {/* <DataExplanation /> */}
      </div>
    </div>
  );
}