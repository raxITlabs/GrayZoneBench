/**
 * GrayZoneBench Dashboard - Simplified Provider Comparison View
 * Inspired by Epoch AI's clean design philosophy
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshButton } from '@/components/ui/refresh-button';
import { GraphView } from '@/components/dashboard/GraphView';
import { TableView } from '@/components/dashboard/TableView';
import { ModelCards } from '@/components/dashboard/ModelCards';
import { DetailedEvaluationTable } from '@/components/dashboard/DetailedEvaluationTable';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { ExplanationSidebar } from '@/components/dashboard/ExplanationSidebar';
import { Shield, BarChart3, Table, Settings } from 'lucide-react';
import SwitchButton from '@/components/kokonutui/switch-button';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import { getUniqueProvidersFromMetadata } from '@/libs/data-transforms';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ValueMomentBanner } from '@/components/ui/value-moment-banner';
import { useSimplePopup } from '@/hooks/use-simple-popup';

export default function DashboardPage() {
  const [metadata, setMetadata] = useState<BenchmarkMetadata | null>(null);
  const [modelData, setModelData] = useState<Record<string, ModelData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // View settings
  const [activeTab, setActiveTab] = useState<'graph' | 'table'>('graph');
  const [groupByProvider, setGroupByProvider] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Check if mobile/tablet (1024px breakpoint for layout decisions)
  const isMobile = useIsMobile(1024);
  
  // Simple popup timer
  const popup = useSimplePopup();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch data function
  const fetchData = async () => {
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
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Header Skeleton */}
        <header className="container mx-auto px-4 py-3 md:py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 md:gap-3">
              <Skeleton className="w-10 h-10 md:w-12 md:h-12 mt-1" />
              <div>
                <Skeleton className="h-8 w-40 md:w-48 mb-2" />
                <Skeleton className="h-5 w-80 md:w-96" />
              </div>
            </div>
            <Skeleton className="w-12 h-6" />
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="container mx-auto px-4 py-6">
          {/* Graph/Table Section with Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Skeleton */}
            <aside className="w-full lg:w-[400px]">
              <Card className="h-[600px]">
                <div className="p-6 space-y-6">
                  {/* Introduction section */}
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  
                  {/* Metrics definitions */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  </div>
                  
                  {/* Learn more section */}
                  <div className="space-y-3 pt-4 border-t">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  
                  {/* Reading the Graph section */}
                  <div className="space-y-3 pt-4 border-t">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </div>
              </Card>
            </aside>
            
            {/* Graph/Table Card Skeleton */}
            <div className="flex-1">
              <Card className="relative h-[600px]">
                {/* Tabs Header Skeleton */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex gap-1 bg-muted rounded-md p-1">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
                
                {/* Graph Content Skeleton */}
                <div className="p-6">
                  <div className="flex gap-4">
                    {/* Main Graph Area */}
                    <div className="flex-1">
                      <Skeleton className="h-96 w-full" />
                    </div>
                    
                    {/* Legend Skeleton - Desktop only */}
                    <div className="hidden lg:block w-36 flex-shrink-0 space-y-3">
                      <Skeleton className="h-5 w-20" />
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Skeleton className="w-3 h-3 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-2 w-12" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Model Cards Section Skeleton */}
          <div className="mt-8">
            <Card>
              <div className="p-6 space-y-6">
                {/* Cards Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
                
                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-7 h-7 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <div className="text-right">
                            <Skeleton className="h-3 w-12 mb-1" />
                            <Skeleton className="h-4 w-10" />
                          </div>
                        </div>
                        <Skeleton className="h-5 w-32" />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center space-y-2">
                            <Skeleton className="h-4 w-12 mx-auto" />
                            <Skeleton className="h-6 w-16 mx-auto" />
                          </div>
                          <div className="text-center space-y-2">
                            <Skeleton className="h-4 w-16 mx-auto" />
                            <Skeleton className="h-6 w-16 mx-auto" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Table Section Skeleton */}
          <div className="mt-8">
            <Card>
              <div className="p-6 space-y-4">
                {/* Table Header */}
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
                
                {/* Table Controls */}
                <div className="flex justify-between items-center gap-4">
                  <Skeleton className="h-9 w-64" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
                
                {/* Table Skeleton */}
                <div className="border rounded-md">
                  <div className="p-4 space-y-3">
                    {/* Table Headers */}
                    <div className="flex gap-4">
                      {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-4 w-20 flex-shrink-0" />
                      ))}
                    </div>
                    {/* Table Rows */}
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        {[...Array(8)].map((_, j) => (
                          <Skeleton key={j} className="h-8 w-20 flex-shrink-0" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </main>
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="container mx-auto px-4 py-3 md:py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 md:gap-3">
            {mounted ? (
              <Image
                src={resolvedTheme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo-light.svg'}
                alt="GrayZoneBench Logo"
                width={40}
                height={40}
                className="w-10 h-10 md:w-12 md:h-12 mt-1"
              />
            ) : (
              <Shield className="w-10 h-10 md:w-12 md:h-12 text-primary mt-1" />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">GrayZoneBench</h1>
              <p className="text-muted-foreground mt-1 text-base md:text-lg">
                Evaluating how models handle prompts that in the gray zone between safe and unsafe
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <RefreshButton 
              size="default" 
              onRefresh={fetchData}
            />
            <SwitchButton size="default" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Graph/Table Section with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Explanation (Shows above content on mobile, left side on desktop) */}
          <aside className="w-full lg:w-[400px] lg:flex">
            <ExplanationSidebar 
              activeTab={activeTab}
              modelData={modelData}
              metadata={metadata}
            />
          </aside>
          
          {/* Right Panel - Graph/Table Only */}
          <div className="flex-1">
            <Card className="relative">
              <Tabs 
                value={activeTab} 
                onValueChange={(v) => setActiveTab(v as 'graph' | 'table')}
              >
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
          </div>
        </div>

        {/* Enhanced Model Cards Section - Full Width */}
        <div className="mt-8">
          <Card>
            <div className="p-6">
              <ModelCards
                metadata={metadata}
                modelData={modelData}
                selectedProviders={selectedProviders}
              />
            </div>
          </Card>
        </div>

        {/* Detailed Evaluation Table Section - Full Width */}
        <div className="mt-8">
          <Card>
            <div className="p-6">
              <DetailedEvaluationTable
                metadata={metadata}
                modelData={modelData}
                selectedProviders={selectedProviders}
              />
            </div>
          </Card>
        </div>
      </main>

      {/* Simple Popup Banner */}
      <ValueMomentBanner
        isVisible={popup.isVisible}
        onDismiss={popup.dismissPopup}
      />

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground/70">
            Brought to you by the{' '}
            <a 
              href="https://raxit.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline underline-offset-2"
            >
              raxIT AI
            </a>{' '}
            team
          </p>
        </div>
      </footer>
    </div>
  );
}