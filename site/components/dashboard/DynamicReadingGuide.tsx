/**
 * DynamicReadingGuide Component - Context-aware guide with real-time insights
 */
'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { TypewriterText } from '@/components/ui/typewriter';
import { ProviderLogo } from '@/components/ui/provider-logo';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import { detectProvider } from '@/libs/data-transforms';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Trophy, 
  ShieldCheck, 
  Lightbulb, 
  Target, 
  List, 
  Info,
  Star,
  TrendingUp,
  Users,
  MessageSquare
} from 'lucide-react';

interface DynamicReadingGuideProps {
  activeTab: 'graph' | 'table';
  modelData: Record<string, ModelData>;
  metadata: BenchmarkMetadata | null;
}

// Helper function to format model names professionally
function formatModelName(name: string): string {
  // Handle common model patterns
  const formatted = name
    // Handle GPT models
    .replace(/^gpt-?(\d+(?:\.\d+)?)-?(.*)$/i, (_, version, variant) => {
      const v = variant ? `-${variant}` : '';
      return `GPT-${version}${v}`;
    })
    // Handle Claude models
    .replace(/^claude-?(\d+(?:\.\d+)?)-?(.*)$/i, (_, version, variant) => {
      const v = variant ? ` ${variant.charAt(0).toUpperCase() + variant.slice(1)}` : '';
      return `Claude ${version}${v}`;
    })
    // Handle Gemini models
    .replace(/^gemini[- _]?(\d+)[- _]?(\d+)[- _]?(.*)$/i, (_, major, minor, variant) => {
      const v = variant ? ` ${variant.charAt(0).toUpperCase() + variant.slice(1)}` : '';
      return `Gemini ${major}.${minor}${v}`;
    })
    // Handle o1/o3 models
    .replace(/^o(\d+)[- _]?(.*)$/i, (_, version, variant) => {
      const v = variant ? `-${variant}` : '';
      return `O${version}${v}`;
    })
    // Handle other patterns - capitalize words
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
}

export function DynamicReadingGuide({
  activeTab,
  modelData,
  metadata
}: DynamicReadingGuideProps) {
  
  // Generate insights based on current data and active tab
  const insights = useMemo(() => {
    if (!metadata || Object.keys(modelData).length === 0) {
      return [{ text: "Loading benchmark data...", deleteAfter: false, icon: Info }];
    }

    // Calculate statistics from model data - filter out models with no valid data
    const allModels = Object.entries(modelData);
    
    const models = allModels
      .map(([name, data]) => {
        // Get average scores from stats
        const safety = data.stats?.avg_safety || 0;
        const helpfulness = data.stats?.avg_helpfulness || 0;
        const evaluations = data.stats?.total_prompts || 0;
        
        // Find most common response mode from results - using same hierarchy as TableView
        const results = Object.values(data.results || {});
        const responseModes = results
          .map(r => {
            // Try agent consensus result first, then gray zone navigation, then deterministic fallback
            return r.safety_tier_results?.agent?.raw?.consensus_result?.gray_zone_result?.response_mode ||
                   r.safety_tier_results?.agent?.raw?.gray_zone_navigation?.response_mode ||
                   r.safety_tier_results?.deterministic?.response_mode ||
                   'unknown';
          })
          .filter(mode => mode !== 'unknown');
        
        const modeCount: Record<string, number> = {};
        responseModes.forEach(mode => {
          modeCount[mode] = (modeCount[mode] || 0) + 1;
        });
        
        const mostCommonMode = Object.entries(modeCount).length > 0
          ? Object.entries(modeCount).sort(([,a], [,b]) => b - a)[0][0]
          : 'unknown';
        
        return {
          name,
          safety,
          helpfulness,
          effectiveness: safety * helpfulness,
          provider: detectProvider(name),
          responseMode: mostCommonMode,
          evaluations,
          tokens: data.stats?.total_tokens || 0
        };
      })
      .filter(m => {
        const include = m.evaluations > 0 && (m.safety > 0 || m.helpfulness > 0);
        return include;
      }); // Only include models with actual evaluation data

    // Sort by effectiveness
    models.sort((a, b) => b.effectiveness - a.effectiveness);

    if (activeTab === 'graph') {
      // Graph-specific conversational insights
      const topPerformer = models[0];
      const idealZoneModels = models.filter(m => m.safety > 0.7 && m.helpfulness > 0.7);
      const strugglingModels = models.filter(m => m.safety < 0.5 && m.helpfulness < 0.5);
      const providers = [...new Set(models.map(m => m.provider))];

      const insights = [];
      
      // Welcome message with context
      insights.push({
        text: `Welcome! Let's explore how ${models.length} AI models handle tricky gray-zone scenarios. Each dot tells a unique story...`,
        deleteAfter: true,
        pauseAfter: 2500,
        icon: MessageSquare
      });

      // Top performer story
      if (topPerformer) {
        const cleanName = formatModelName(topPerformer.name);
        insights.push({
          text: `Meet our champion: ${cleanName} is absolutely crushing it with ${(topPerformer.effectiveness * 100).toFixed(0)}% effectiveness. This ${topPerformer.provider} model found the sweet spot!`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: Trophy,
          modelName: cleanName,
          provider: topPerformer.provider
        });
      }

      // Ideal zone storytelling
      if (idealZoneModels.length > 0) {
        const topIdeal = idealZoneModels[0];
        const cleanName = formatModelName(topIdeal.name);
        insights.push({
          text: `The top-right "Ideal Zone" is where magic happens. ${cleanName} leads ${idealZoneModels.length > 1 ? `${idealZoneModels.length} models` : 'the pack'} with stellar safety AND helpfulness.`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: Star,
          modelName: cleanName,
          provider: topIdeal.provider
        });
      }

      // Provider comparison story
      if (providers.length > 1) {
        const providerAverages = providers.map(provider => {
          const providerModels = models.filter(m => m.provider === provider);
          const avgEffectiveness = providerModels.reduce((sum, m) => sum + m.effectiveness, 0) / providerModels.length;
          return { provider, avgEffectiveness, count: providerModels.length };
        }).sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);

        const leader = providerAverages[0];
        insights.push({
          text: `Here's something interesting: ${leader.provider}'s ${leader.count} models average ${(leader.avgEffectiveness * 100).toFixed(0)}% effectiveness. They're really nailing the gray zone challenge!`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: TrendingUp
        });
      }

      // Bottom performers with empathy
      if (strugglingModels.length > 0) {
        const struggling = strugglingModels[strugglingModels.length - 1];
        const cleanName = formatModelName(struggling.name);
        insights.push({
          text: `Not everyone's having their best day. ${cleanName} and ${strugglingModels.length > 1 ? 'others' : 'some models'} are finding gray zones pretty challenging. Room for improvement!`,
          deleteAfter: true,
          pauseAfter: 2500,
          icon: Users,
          modelName: cleanName,
          provider: struggling.provider
        });
      }

      // Teaching moment about quadrants
      insights.push({
        text: `Pro tip: Look for models in the top-right corner - they've mastered being both safe AND helpful. That's the golden combination!`,
        deleteAfter: false,
        pauseAfter: 2000,
        icon: Lightbulb
      });

      return insights.length > 0 ? insights : [{ text: "Getting the models ready for their performance review...", deleteAfter: false, icon: Info }];
    } else {
      // Table-specific conversational insights
      const top3 = models.slice(0, 3);
      const safeButUnhelpful = models.filter(m => m.safety > 0.7 && m.helpfulness < 0.5);
      const helpfulButUnsafe = models.filter(m => m.helpfulness > 0.7 && m.safety < 0.5);

      const insights = [];
      
      // Table introduction
      insights.push({
        text: `Here's your detailed scorecard! I've ranked all ${models.length} models by their overall effectiveness. Let's dive into the numbers...`,
        deleteAfter: true,
        pauseAfter: 2500,
        icon: MessageSquare
      });

      // Top performer story
      if (top3.length > 0) {
        const winner = top3[0];
        const cleanName = formatModelName(winner.name);
        insights.push({
          text: `Your table-topper is ${cleanName} with an impressive ${(winner.effectiveness * 100).toFixed(0)}% effectiveness score! They're setting the standard for gray-zone navigation.`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: Trophy,
          modelName: cleanName,
          provider: winner.provider
        });
      }

      // Runner-up story
      if (top3.length > 1) {
        const runnerUp = top3[1];
        const cleanName = formatModelName(runnerUp.name);
        insights.push({
          text: `Hot on their heels is ${cleanName} at ${(runnerUp.effectiveness * 100).toFixed(0)}%. The competition is fierce up there!`,
          deleteAfter: true,
          pauseAfter: 2500,
          icon: Star,
          modelName: cleanName,
          provider: runnerUp.provider
        });
      }

      // Safety pattern analysis
      if (safeButUnhelpful.length > 0) {
        const cautious = safeButUnhelpful[0];
        const cleanName = formatModelName(cautious.name);
        insights.push({
          text: `${cleanName} and ${safeButUnhelpful.length > 1 ? `${safeButUnhelpful.length - 1} others are` : 'is'} being extra cautious - high safety but playing it safe on helpfulness. Sometimes being too careful hurts!`,
          deleteAfter: true,
          pauseAfter: 2800,
          icon: Shield,
          modelName: cleanName,
          provider: cautious.provider
        });
      }

      // Helpfulness pattern analysis
      if (helpfulButUnsafe.length > 0) {
        const helpful = helpfulButUnsafe[0];
        const cleanName = formatModelName(helpful.name);
        insights.push({
          text: `On the flip side, ${cleanName} ${helpfulButUnsafe.length > 1 ? `and ${helpfulButUnsafe.length - 1} others` : ''} are super helpful but maybe taking some safety risks. Classic trade-off dilemma!`,
          deleteAfter: true,
          pauseAfter: 2800,
          icon: AlertTriangle,
          modelName: cleanName,
          provider: helpful.provider
        });
      }

      // Interactive tip
      insights.push({
        text: `Quick tip: Click any column header to sort by that metric. The effectiveness column (safety × helpfulness) shows who's truly mastering the balance!`,
        deleteAfter: false,
        icon: Lightbulb
      });

      return insights.length > 0 ? insights : [{ text: "Crunching the numbers for your detailed breakdown...", deleteAfter: false, icon: Info }];
    }
  }, [activeTab, modelData, metadata]);

  const title = activeTab === 'graph' ? "Your AI Guide to the Graph" : "Your AI Guide to the Table";

  return (
    <Card className="p-4 lg:p-4 flex-1">
      <h3 className="text-lg font-medium text-foreground mb-3">{title}</h3>
      
      {/* Dynamic conversational insights with typewriter effect and pause control */}
      <div className="min-h-[24px]">
        <TypewriterText
          sequences={insights}
          typingSpeed={25}
          startDelay={200}
          autoLoop={insights.length > 1}
          loopDelay={2000}
          allowPause={true}
        />
      </div>
    </Card>
  );
}