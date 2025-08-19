/**
 * SampleDetailsModal Component - Shows detailed evaluation breakdown for a specific model
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Copy,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { RationaleFormatter } from './RationaleFormatter';
import { EvaluationTierViewer } from './EvaluationTierViewer';
import { getScoreColorClass, getResponseModeBadgeProps, getTierBadgeProps, formatScore } from '@/lib/utils';
import type { SampleEvaluation } from '@/types/comprehensive-evaluation';

interface SampleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  samples: SampleEvaluation[];
  initialSampleIndex?: number;
}

export function SampleDetailsModal({
  isOpen,
  onClose,
  modelName,
  samples,
  initialSampleIndex = 0
}: SampleDetailsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialSampleIndex);
  const [activeTab, setActiveTab] = useState('conversation');
  const [jsonCopied, setJsonCopied] = useState(false);

  const currentSample = samples[currentIndex];

  if (!currentSample) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(samples.length - 1, currentIndex + 1));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {modelName} - Sample {currentIndex + 1} of {samples.length}
              </DialogTitle>
              <DialogDescription>
                Category: {currentSample.category} • {new Date(currentSample.timestamp).toLocaleDateString()}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentIndex + 1} / {samples.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === samples.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conversation" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversation
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Technical
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="conversation" className="h-full mt-4">
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-6">
                    {/* Scores Overview */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className={`text-2xl font-bold p-2 rounded-lg border ${getScoreColorClass(currentSample.safetyScore, { high: 0.7, medium: 0.5 })} bg-muted/20`}>
                              {formatScore(currentSample.safetyScore)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Safety Score</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className={`text-2xl font-bold p-2 rounded-lg border ${getScoreColorClass(currentSample.helpfulnessScore, { high: 0.7, medium: 0.5 })} bg-muted/20`}>
                              {formatScore(currentSample.helpfulnessScore)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Helpfulness Score</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className={`text-2xl font-bold p-2 rounded-lg border ${getScoreColorClass(currentSample.effectivenessScore, { high: 0.5, medium: 0.3 })} bg-muted/20`}>
                              {formatScore(currentSample.effectivenessScore)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Effectiveness</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Prompt */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Prompt</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(currentSample.prompt)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm whitespace-pre-wrap">
                          {currentSample.prompt}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Response */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Model Response</span>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const badgeProps = getResponseModeBadgeProps(currentSample.responseMode);
                              return (
                                <Badge variant={badgeProps.variant} className={badgeProps.className}>
                                  {badgeProps.formattedMode}
                                </Badge>
                              );
                            })()}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                currentSample.responseMode === 'direct-answer' ? 
                                  '**** Response content hidden for security reasons ****' : 
                                  currentSample.response
                              )}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                          {currentSample.responseMode === 'direct-answer' ? 
                            <div className="text-muted-foreground italic">
                              **** Response content hidden for security reasons ****
                            </div> : 
                            currentSample.response
                          }
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Gray Zone Classification</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Badge variant="outline" className="mb-2">
                            {currentSample.grayZoneType}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Evaluated using {(() => {
                              const tierProps = getTierBadgeProps(currentSample.tierUsed);
                              return (
                                <Badge variant={tierProps.variant} className={`text-xs ${tierProps.className}`}>
                                  {currentSample.tierUsed}
                                </Badge>
                              );
                            })()} tier
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Evaluation Context</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Category:</span> {currentSample.category}
                            </div>
                            <div>
                              <span className="font-medium">Prompt Index:</span> {currentSample.promptIndex}
                            </div>
                            <div>
                              <span className="font-medium">Timestamp:</span> {new Date(currentSample.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analysis" className="h-full mt-4">
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-6">
                    {/* Rationale Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {currentSample.safetyRationale && (
                        <RationaleFormatter
                          rationale={currentSample.safetyRationale}
                          type="safety"
                        />
                      )}
                      {currentSample.helpfulnessRationale && (
                        <RationaleFormatter
                          rationale={currentSample.helpfulnessRationale}
                          type="helpfulness"
                        />
                      )}
                    </div>

                    {/* Score Breakdown would go here if available in the data */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Score Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Safety Score</span>
                            <span className={`font-mono font-semibold ${getScoreColorClass(currentSample.safetyScore, { high: 0.7, medium: 0.5 })}`}>
                              {formatScore(currentSample.safetyScore)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Helpfulness Score</span>
                            <span className={`font-mono font-semibold ${getScoreColorClass(currentSample.helpfulnessScore, { high: 0.7, medium: 0.5 })}`}>
                              {formatScore(currentSample.helpfulnessScore)}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center font-semibold">
                            <span>Effectiveness (Safety × Helpfulness)</span>
                            <span className={`font-mono font-semibold ${getScoreColorClass(currentSample.effectivenessScore, { high: 0.5, medium: 0.3 })}`}>
                              {formatScore(currentSample.effectivenessScore)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="technical" className="h-full mt-4">
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-6">
                    {/* Evaluation Tiers - This would need tier data from the sample */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Evaluation Method</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Tier Used:</span>
                            {(() => {
                              const tierProps = getTierBadgeProps(currentSample.tierUsed);
                              return (
                                <Badge variant={tierProps.variant} className={tierProps.className}>
                                  {currentSample.tierUsed}
                                </Badge>
                              );
                            })()}
                          </div>
                          <div className="flex justify-between">
                            <span>Response Mode:</span>
                            {(() => {
                              const badgeProps = getResponseModeBadgeProps(currentSample.responseMode);
                              return (
                                <Badge variant={badgeProps.variant} className={badgeProps.className}>
                                  {badgeProps.formattedMode}
                                </Badge>
                              );
                            })()}
                          </div>
                          <div className="flex justify-between">
                            <span>Gray Zone Type:</span>
                            <Badge variant="outline">{currentSample.grayZoneType}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Raw Data Export */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Raw Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              const safeSample = currentSample.responseMode === 'direct-answer' ? 
                                {
                                  ...currentSample,
                                  response: '**** Response content hidden for security reasons ****'
                                } : 
                                currentSample;
                              copyToClipboard(JSON.stringify(safeSample, null, 2));
                              setJsonCopied(true);
                              setTimeout(() => setJsonCopied(false), 2000);
                            }}
                            disabled={jsonCopied}
                            className={`w-full ${jsonCopied ? 'text-chart-1 border-chart-1' : ''}`}
                          >
                            {jsonCopied ? (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            {jsonCopied ? 'Copied!' : 'Copy as JSON'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}