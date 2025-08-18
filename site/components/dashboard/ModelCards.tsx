/**
 * ModelCards Component - Expandable cards showing comprehensive model evaluation data
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProviderLogo } from '@/components/ui/provider-logo';
import { 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  HelpCircle, 
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Settings
} from 'lucide-react';
import {
  Expandable,
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableCardHeader,
  ExpandableContent,
  ExpandableTrigger,
} from '@/components/ui/expandable';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import type { ModelCardData } from '@/types/comprehensive-evaluation';
import { prepareModelCardsData } from '@/libs/comprehensive-data-transforms';

interface ModelCardsProps {
  metadata: BenchmarkMetadata | null;
  modelData: Record<string, ModelData>;
  selectedProviders: string[];
}

export function ModelCards({
  metadata,
  modelData,
  selectedProviders
}: ModelCardsProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<'effectiveness' | 'safety' | 'helpfulness'>('effectiveness');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prepare card data
  const cardsData = useMemo(() => {
    if (!metadata || Object.keys(modelData).length === 0) return [];
    
    let data = prepareModelCardsData(modelData, selectedProviders);
    
    // Sort by selected criteria
    data.sort((a, b) => {
      switch (sortBy) {
        case 'safety': return b.safety - a.safety;
        case 'helpfulness': return b.helpfulness - a.helpfulness;
        case 'effectiveness': 
        default: return b.effectiveness - a.effectiveness;
      }
    });
    
    return data;
  }, [metadata, modelData, selectedProviders, sortBy]);

  // Filter data based on showAll setting
  const displayData = showAll ? cardsData : cardsData.slice(0, 5);

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;

  // Get score color class
  const getScoreColorClass = (score: number, thresholds: { high: number; medium: number }) => {
    if (score >= thresholds.high) return 'text-chart-1 font-semibold';
    if (score >= thresholds.medium) return 'text-foreground font-medium';
    return 'text-destructive font-semibold';
  };

  const formatResponseMode = (mode: string) => {
    return mode.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (cardsData.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No model data available for selected providers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls - Responsive */}
      {mounted && isMobile ? (
        // Mobile Controls
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold">Model Performance Cards</h3>
            <Badge variant="outline" className="text-sm w-fit">
              {displayData.length} of {cardsData.length} models
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileMenu(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Filters
          </Button>
        </div>
      ) : (
        // Desktop Controls
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Model Performance Cards</h3>
            <Badge variant="outline" className="text-sm">
              {displayData.length} of {cardsData.length} models
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === 'effectiveness' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('effectiveness')}
              >
                Effectiveness
              </Button>
              <Button
                variant={sortBy === 'safety' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('safety')}
              >
                Safety
              </Button>
              <Button
                variant={sortBy === 'helpfulness' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('helpfulness')}
              >
                Helpfulness
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showAll ? 'Show Top 5' : 'Show All'}
            </Button>
          </div>
        </div>
      )}

      {/* Cards Grid - Responsive with proper spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-start">
        {displayData.map((card) => (
          <ModelCard key={card.model} data={card} />
        ))}
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetContent side="right" className="w-full sm:w-96">
          <SheetHeader>
            <SheetTitle>Filters & Sorting</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Sort Options */}
            <div>
              <h4 className="text-sm font-medium mb-3">Sort by</h4>
              <div className="space-y-2">
                <Button
                  variant={sortBy === 'effectiveness' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSortBy('effectiveness');
                    setShowMobileMenu(false);
                  }}
                  className="w-full justify-start"
                >
                  Effectiveness
                </Button>
                <Button
                  variant={sortBy === 'safety' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSortBy('safety');
                    setShowMobileMenu(false);
                  }}
                  className="w-full justify-start"
                >
                  Safety
                </Button>
                <Button
                  variant={sortBy === 'helpfulness' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSortBy('helpfulness');
                    setShowMobileMenu(false);
                  }}
                  className="w-full justify-start"
                >
                  Helpfulness
                </Button>
              </div>
            </div>

            {/* Show All Toggle */}
            <div>
              <h4 className="text-sm font-medium mb-3">Display Options</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAll(!showAll);
                  setShowMobileMenu(false);
                }}
                className="w-full justify-start"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showAll ? 'Show Top 5' : 'Show All Models'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ModelCard({ data }: { data: ModelCardData }) {
  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColorClass = (score: number, thresholds: { high: number; medium: number }) => {
    if (score >= thresholds.high) return 'text-chart-1 font-semibold';
    if (score >= thresholds.medium) return 'text-foreground font-medium';
    return 'text-destructive font-semibold';
  };

  const formatResponseMode = (mode: string) => {
    return mode.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'deterministic': return <Target className="w-4 h-4" />;
      case 'moderation': return <Shield className="w-4 h-4" />;
      case 'agent': return <HelpCircle className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getBooleanIcon = (value: boolean) => {
    return value ? 
      <CheckCircle className="w-4 h-4 text-chart-1" /> : 
      <XCircle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Expandable
      expandDirection="vertical"
      expandBehavior="replace"
      onExpandStart={() => console.log(`Expanding ${data.model} card...`)}
    >
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            className={`w-full relative ${isExpanded ? 'z-20 shadow-2xl' : ''}`}
            collapsedSize={{ height: 320 }}
            expandedSize={{ height: undefined }}
            hoverToExpand={false}
            expandDelay={200}
            collapseDelay={300}
          >
            <ExpandableCardHeader>
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={data.provider} size={24} />
                    <Badge variant="secondary" className="text-xs">
                      {data.provider}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Effectiveness</div>
                    <div className={`text-sm font-bold font-mono ${getScoreColorClass(data.effectiveness, { high: 0.5, medium: 0.3 })}`}>
                      {formatScore(data.effectiveness)}
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-foreground leading-tight">
                  {data.model}
                </h3>
              </div>
            </ExpandableCardHeader>

            <ExpandableCardContent>
              {/* Core Metrics - Safety & Helpfulness */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Safety</span>
                  </div>
                  <div className={`text-xl font-bold font-mono ${getScoreColorClass(data.safety, { high: 0.7, medium: 0.5 })}`}>
                    {formatScore(data.safety)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Helpfulness</span>
                  </div>
                  <div className={`text-xl font-bold font-mono ${getScoreColorClass(data.helpfulness, { high: 0.7, medium: 0.5 })}`}>
                    {formatScore(data.helpfulness)}
                  </div>
                </div>
              </div>

              {/* Response Mode */}
              <div className="mb-4">
                <Badge variant="secondary" className="text-sm">
                  {formatResponseMode(data.responseMode)}
                </Badge>
              </div>

              {/* Expanded Content */}
              <ExpandableContent preset="fade" stagger staggerChildren={0.1} className="overflow-y-auto max-h-[400px]">
                <div className="space-y-4">
                  {/* Performance Breakdown */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Performance Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Gray Zone Navigation:</span>
                        <span className="font-mono">{formatScore(data.navigationQuality)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gray Zone Effectiveness:</span>
                        <span className="font-mono">{formatScore(data.grayZoneEffectiveness)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Pipeline */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      {getTierIcon(data.tierUsed)}
                      Evaluation Pipeline
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Deterministic:
                        </span>
                        <span className="font-mono">{formatScore(data.deterministicScore)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Moderation:
                        </span>
                        <span className="font-mono">{formatScore(data.moderationScore)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          Agent:
                        </span>
                        <span className="font-mono">{formatScore(data.agentScore)}</span>
                      </div>
                      <div className="pt-1 border-t">
                        <Badge variant="secondary" className="text-xs">
                          Final: {data.tierUsed.charAt(0).toUpperCase() + data.tierUsed.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Response Analysis */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Response Analysis
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        {getBooleanIcon(data.alternativesProvided)}
                        <span>Alternatives</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getBooleanIcon(data.educationProvided)}
                        <span>Education</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getBooleanIcon(data.explanationProvided)}
                        <span>Explanation</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span>Refusal Confidence:</span>
                        <span className="font-mono">{formatScore(data.refusalConfidence)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Harm Assessment */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Harm Assessment</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Facilitation:</span>
                        <div className="font-mono">{formatScore(data.meaningfulFacilitation)}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {data.facilitationLevel}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Harm Level:</span>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {data.harmLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ExpandableContent>
            </ExpandableCardContent>

            <ExpandableContent preset="slide-up">
              <ExpandableCardFooter>
                <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{data.responseTime.toFixed(2)}s avg</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>{formatCurrency(data.costEstimate)}</span>
                  </div>
                  <div>
                    {formatNumber(data.totalTokens)} tokens
                  </div>
                </div>
              </ExpandableCardFooter>
            </ExpandableContent>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
  );
}