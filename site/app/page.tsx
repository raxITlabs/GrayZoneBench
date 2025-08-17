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
import { BenchmarkExplanation } from '@/components/dashboard/BenchmarkExplanation';
import { ExplanationSidebar } from '@/components/dashboard/ExplanationSidebar';
import { Shield, BarChart3, Table, Settings } from 'lucide-react';
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

      {/* Mobile Explanation - Above results on mobile/tablet */}
      <div className="lg:hidden container mx-auto px-4 pb-6">
        <BenchmarkExplanation />
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Explanation (Desktop only) */}
          <div className="hidden lg:flex lg:w-[400px]">
            <ExplanationSidebar />
          </div>
          
          {/* Right Panel - Results */}
          <div className="flex-1">
            <Card className="relative">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'graph' | 'table')}>
                {/* Tabs Header */}
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
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
                  
                  {/* Graph Settings - Only show when Graph tab is active */}
                  {activeTab === 'graph' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Graph Settings
                    </Button>
                  )}
                </div>

                {/* Content Area */}
                <TabsContent value="graph" className="mt-0 relative">
                  <GraphView
                    metadata={metadata}
                    modelData={modelData}
                    groupByProvider={groupByProvider}
                    selectedProviders={selectedProviders}
                  />
                  
                  {/* Desktop: Overlay Settings Panel */}
                  {!isMobile && showSettings && (
                    <div className="absolute top-0 right-0 h-full w-80 bg-background border-l shadow-lg z-20 animate-in slide-in-from-right duration-300">
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
                  
                  {/* Mobile: Sheet/Drawer */}
                  {isMobile && (
                    <Sheet open={showSettings} onOpenChange={setShowSettings}>
                      <SheetContent side="right" className="w-full sm:w-96 p-0">
                        <SheetHeader>
                          <SheetTitle>Graph Settings</SheetTitle>
                        </SheetHeader>
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
                  <TableView
                    metadata={metadata}
                    modelData={modelData}
                    selectedProviders={selectedProviders}
                  />
                </TabsContent>
              </Tabs>
            </Card>

            {/* Data Explanation */}
            {/* <DataExplanation /> */}
          </div>
        </div>
      </div>
    </div>
  );
}