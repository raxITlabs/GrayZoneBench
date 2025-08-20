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
  HeartHandshake,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Settings,
  MessageSquare
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
import { getResponseModeBadgeProps } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile(768); // md breakpoint

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

  // Filter data based on showAll setting - show top 2 + bottom 2 for spectrum view
  const displayData = showAll ? cardsData : (cardsData.length <= 4 ? cardsData : [...cardsData.slice(0, 2), ...cardsData.slice(-2)]);

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
    <div className="space-y-6 pb-12">
      {/* Controls - Responsive */}
      {isMobile ? (
        // Mobile Controls
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold">Model Performance Cards</h3>
            <Badge variant="outline" className="text-sm w-fit">
              {showAll ? `${displayData.length} models` : `${displayData.length} models (spectrum)`}
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
              {showAll ? `${displayData.length} models` : `${displayData.length} models (top & bottom)`}
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
              {showAll ? 'Show Spectrum' : 'Show All'}
            </Button>
          </div>
        </div>
      )}

      {/* Cards Grid - Responsive with proper spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 items-start pb-8 md:pb-12 overflow-visible">
        {displayData.map((card, index) => {
          // Determine if card is on the right edge based on grid columns
          const cols = isMobile ? 1 : (window.innerWidth >= 1280 ? 4 : (window.innerWidth >= 1024 ? 3 : 2));
          const isRightEdge = (index + 1) % cols === 0;
          return (
            <div key={card.model} style={{ position: 'relative', zIndex: displayData.length - index }}>
              <ModelCard data={card} isMobile={isMobile} isRightEdge={isRightEdge} />
            </div>
          );
        })}
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
                {showAll ? 'Show Spectrum' : 'Show All Models'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ModelCard({ data, isMobile, isRightEdge = false }: { data: ModelCardData; isMobile: boolean; isRightEdge?: boolean }) {
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

  // Conversational explanation helpers
  const getEffectivenessStory = () => {
    const effectiveness = data.effectiveness * 100;
    const safety = data.safety * 100;
    const helpfulness = data.helpfulness * 100;
    
    if (effectiveness >= 50) {
      return `This model achieved a strong ${effectiveness.toFixed(1)}% effectiveness score by balancing helpful responses (${helpfulness.toFixed(1)}%) with safety considerations (${safety.toFixed(1)}%).`;
    } else if (effectiveness >= 30) {
      return `This model shows moderate effectiveness (${effectiveness.toFixed(1)}%) - it's ${helpfulness >= 70 ? 'quite helpful' : 'somewhat helpful'} but ${safety < 70 ? 'requires caution due to safety concerns' : 'maintains reasonable safety'}.`;
    } else {
      return `This model has limited effectiveness (${effectiveness.toFixed(1)}%) due to ${safety < 50 ? 'significant safety concerns' : 'low helpfulness'}, requiring careful consideration before use.`;
    }
  };

  const getEvaluationStory = () => {
    const tier = data.tierUsed;
    if (tier === 'deterministic') {
      return "We assessed this model using our automated rule-based system - the responses followed clear patterns that our deterministic analysis could handle.";
    } else if (tier === 'moderation') {
      return "We assessed this model using our 3-tier evaluation system: automated rules, content moderation API, with the moderation layer making the final determination.";
    } else {
      return "We assessed this model using our full 3-tier evaluation system: automated rules, content moderation, and AI-based analysis, with the AI evaluator making the final judgment.";
    }
  };

  const getResponseModeStory = () => {
    const mode = data.responseMode;
    if (mode === 'direct-answer') {
      return "This model tends to provide direct answers to questions, even when they involve sensitive topics.";
    } else if (mode === 'constructive-refusal') {
      return "This model thoughtfully declines harmful requests while explaining why and often suggesting safer alternatives.";
    } else if (mode === 'safe-completion') {
      return "This model finds creative ways to be helpful while steering conversations away from harmful content.";
    } else {
      return "This model shows varied response patterns depending on the type of request.";
    }
  };

  const getKeyStrengths = () => {
    const strengths = [];
    if (data.helpfulness > 0.8) strengths.push("Provides comprehensive, useful responses");
    if (data.safety > 0.7) strengths.push("Maintains strong safety boundaries");
    if (data.alternativesProvided) strengths.push("Offers helpful alternatives when declining requests");
    if (data.educationProvided) strengths.push("Provides educational context");
    if (data.explanationProvided) strengths.push("Explains its reasoning");
    return strengths.length > 0 ? strengths : ["Shows consistent response patterns"];
  };

  const getConcerns = () => {
    const concerns = [];
    if (data.safety < 0.5) concerns.push("May provide information that could facilitate harmful activities");
    else if (data.safety < 0.7) concerns.push("Occasionally provides concerning responses in sensitive areas");
    if (data.helpfulness < 0.5) concerns.push("Limited helpfulness in providing useful information");
    if (data.meaningfulFacilitation > 0.3) concerns.push("Sometimes provides information that could lower barriers to harm");
    return concerns.length > 0 ? concerns : ["No significant concerns identified"];
  };

  return (
    <div className={`relative ${isRightEdge ? 'z-30' : ''}`}>
      <Expandable
        expandDirection="both"
        expandBehavior="push"
        onExpandStart={() => console.log(`Expanding ${data.model} card...`)}
      >
        {({ isExpanded }) => (
          <ExpandableTrigger>
            <div style={{
              transformOrigin: isRightEdge ? 'top right' : 'top left',
              marginLeft: isRightEdge && isExpanded && !isMobile ? '-80px' : '0',
              transition: 'margin-left 0.3s ease-in-out',
              zIndex: isExpanded ? (isMobile ? 100 : 50) : 'auto',
              position: isExpanded ? 'relative' : 'static',
            }}>
              <ExpandableCard
                className="w-full relative"
                collapsedSize={{ width: 320, height: 320 }}
                expandedSize={isMobile ? { width: 340, height: 750 } : { width: 400, height: 650 }}
                hoverToExpand={false}
                expandDelay={200}
                collapseDelay={300}
              >
            <ExpandableCardHeader>
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={data.provider} size={28} />
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
                <h3 className="font-semibold text-lg text-foreground leading-tight truncate">
                  {data.model}
                </h3>
              </div>
            </ExpandableCardHeader>

            <ExpandableCardContent>
              {/* Core Metrics - Safety & Helpfulness - Always Visible */}
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
                    <HeartHandshake className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Helpfulness</span>
                  </div>
                  <div className={`text-xl font-bold font-mono ${getScoreColorClass(data.helpfulness, { high: 0.7, medium: 0.5 })}`}>
                    {formatScore(data.helpfulness)}
                  </div>
                </div>
              </div>

              {/* Response Mode - Always Visible */}
              <div className="mb-4">
                {(() => {
                  const badgeProps = getResponseModeBadgeProps(data.responseMode);
                  return (
                    <Badge variant={badgeProps.variant} className={`text-sm ${badgeProps.className}`}>
                      {badgeProps.formattedMode}
                    </Badge>
                  );
                })()}
              </div>

              {/* Expanded Content - Conversational */}
              <ExpandableContent 
                preset="fade" 
                stagger 
                staggerChildren={0.1} 
                className={`overflow-y-auto ${isMobile ? 'max-h-[500px]' : 'max-h-[400px]'}`}
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9ca3af transparent',
                }}
              >
                <div className="space-y-4 text-sm">
                  {/* How We Evaluated This Model */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      How We Evaluated This Model
                    </h4>
                    <div className="text-xs leading-relaxed text-muted-foreground mb-2">
                      {getEffectivenessStory()}
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      {getEvaluationStory()}
                    </div>
                  </div>

                  {/* Response Approach */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Response Approach
                    </h4>
                    <div className="text-xs leading-relaxed text-muted-foreground mb-2">
                      {getResponseModeStory()}
                    </div>
                  </div>

                  {/* What This Model Does Well */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-chart-1" />
                      What This Model Does Well
                    </h4>
                    <div className="space-y-1">
                      {getKeyStrengths().map((strength, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <div className="w-1 h-1 rounded-full bg-chart-1 mt-2 flex-shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Areas to Consider */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Areas to Consider
                    </h4>
                    <div className="space-y-1">
                      {getConcerns().map((concern, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <div className="w-1 h-1 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">{concern}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Line */}
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-sm mb-2">The Bottom Line</h4>
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="text-xs leading-relaxed">
                        <span className="font-medium">Best for:</span> {data.helpfulness > 0.7 ? "General helpful tasks, information gathering" : "Basic queries with supervision"}
                      </div>
                      <div className="text-xs leading-relaxed mt-1">
                        <span className="font-medium">Use caution for:</span> {data.safety < 0.7 ? "Sensitive topics, potentially harmful requests" : "Complex ethical scenarios"}
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
                  <div>
                    {formatNumber(data.totalTokens)} tokens
                  </div>
                </div>
              </ExpandableCardFooter>
            </ExpandableContent>
              </ExpandableCard>
            </div>
          </ExpandableTrigger>
        )}
      </Expandable>
    </div>
  );
}