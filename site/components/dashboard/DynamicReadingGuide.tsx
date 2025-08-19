/**
 * DynamicReadingGuide Component - Context-aware guide with real-time insights
 */
'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { TypewriterText } from '@/components/ui/typewriter';
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
  Info 
} from 'lucide-react';

interface DynamicReadingGuideProps {
  activeTab: 'graph' | 'table';
  modelData: Record<string, ModelData>;
  metadata: BenchmarkMetadata | null;
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

    // Calculate statistics from model data
    const models = Object.entries(modelData).map(([name, data]) => {
      // Get average scores from stats
      const safety = data.stats?.avg_safety || 0;
      const helpfulness = data.stats?.avg_helpfulness || 0;
      
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
        evaluations: data.stats?.total_prompts || 0,
        tokens: data.stats?.total_tokens || 0
      };
    });

    // Sort by effectiveness
    models.sort((a, b) => b.effectiveness - a.effectiveness);

    if (activeTab === 'graph') {
      // Graph-specific insights with quadrant explanations mixed in
      const topPerformer = models[0];
      const idealZoneModels = models.filter(m => m.safety > 0.7 && m.helpfulness > 0.7);
      const balancedModels = models.filter(m => 
        Math.abs(m.safety - m.helpfulness) < 0.1 && m.effectiveness > 0.4
      );

      const insights = [];
      
      // Top performer insight - more verbose
      if (topPerformer) {
        insights.push({
          text: `Top performer: ${topPerformer.name} achieves ${(topPerformer.effectiveness * 100).toFixed(0)}% effectiveness through balanced safety and helpfulness metrics`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: Trophy
        });
      }

      // Quadrant: Ideal Zone - detailed explanation
      insights.push({
        text: `Ideal Zone (top-right quadrant): Models that excel in both safety and helpfulness, representing optimal gray zone navigation`,
        deleteAfter: true,
        pauseAfter: 3000,
        icon: Target
      });

      // Ideal zone count with context
      if (idealZoneModels.length > 0) {
        insights.push({
          text: `${idealZoneModels.length} model${idealZoneModels.length > 1 ? 's' : ''} achieve${idealZoneModels.length === 1 ? 's' : ''} ideal zone performance with 70%+ safety and helpfulness scores`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: CheckCircle
        });
      }

      // Quadrant: Poor Performance - educational
      insights.push({
        text: `Poor Performance (bottom-left): Models struggling with both safety requirements and helpfulness delivery in gray zone scenarios`,
        deleteAfter: true,
        pauseAfter: 3000,
        icon: XCircle
      });

      // Provider comparison with more context
      const providers = [...new Set(models.map(m => m.provider))];
      if (providers.length > 1) {
        const providerAverages = providers.map(provider => {
          const providerModels = models.filter(m => m.provider === provider);
          const avgEffectiveness = providerModels.reduce((sum, m) => sum + m.effectiveness, 0) / providerModels.length;
          return { provider, avgEffectiveness };
        }).sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);

        if (providerAverages[0]) {
          insights.push({
            text: `Provider analysis: ${providerAverages[0].provider} models average ${(providerAverages[0].avgEffectiveness * 100).toFixed(0)}% effectiveness across evaluation scenarios`,
            deleteAfter: true,
            pauseAfter: 3000,
            icon: List
          });
        }
      }

      // Quadrant: Risky but Helpful - detailed
      insights.push({
        text: `Risky but Helpful (bottom-right): Models providing high helpfulness but with lower safety scores, potentially over-complying with requests`,
        deleteAfter: true,
        pauseAfter: 3000,
        icon: AlertTriangle
      });

      // Balanced models insight with context
      if (balancedModels.length > 0) {
        const bestBalanced = balancedModels[0];
        insights.push({
          text: `Balanced performance: ${bestBalanced.name} demonstrates optimal safety-helpfulness ratio with minimal trade-offs`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: ShieldCheck
        });
      }

      // Quadrant: Over-cautious - educational
      insights.push({
        text: `Over-cautious (top-left): Models prioritizing safety over helpfulness, potentially refusing legitimate requests in gray areas`,
        deleteAfter: false,
        pauseAfter: 3000,
        icon: Shield
      });

      return insights.length > 0 ? insights : [{ text: "Analyzing model performance patterns...", deleteAfter: false, icon: Info }];
    } else {
      // Table-specific insights with column explanations mixed in
      const insights = [];
      
      // Top performers with detailed context
      const top3 = models.slice(0, 3);
      if (top3.length > 0) {
        insights.push({
          text: `Top performer: ${top3[0].name} achieves ${(top3[0].effectiveness * 100).toFixed(0)}% effectiveness, leading gray zone navigation performance`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: Trophy
        });
      }

      // Column explanation: Safety - comprehensive
      insights.push({
        text: `Safety Score: Measures how consistently models refuse harmful requests while maintaining contextual awareness across evaluation scenarios`,
        deleteAfter: true,
        pauseAfter: 3000,
        icon: Shield
      });

      // Response modes analysis
      const responseModes = models.reduce((acc, m) => {
        acc[m.responseMode] = (acc[m.responseMode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonMode = Object.entries(responseModes)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostCommonMode) {
        insights.push({
          text: `Response Mode Analysis: ${mostCommonMode[1]} models primarily use ${mostCommonMode[0].replace(/-/g, ' ')} approach based on consensus evaluation`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: List
        });
      }

      // Column explanation: Helpfulness - detailed
      insights.push({
        text: `Helpfulness Score: Evaluates quality of assistance for legitimate requests, measuring both accuracy and actionability of responses`,
        deleteAfter: true,
        pauseAfter: 3000,
        icon: Lightbulb
      });

      // Safety vs Helpfulness trade-offs analysis
      const safeButUnhelpful = models.filter(m => m.safety > 0.7 && m.helpfulness < 0.5);
      const helpfulButUnsafe = models.filter(m => m.helpfulness > 0.7 && m.safety < 0.5);
      
      if (safeButUnhelpful.length > 0) {
        insights.push({
          text: `Trade-off Analysis: ${safeButUnhelpful.length} model${safeButUnhelpful.length > 1 ? 's' : ''} prioritize safety over helpfulness, potentially over-refusing gray zone requests`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: AlertTriangle
        });
      }

      // Column explanation: Effectiveness - comprehensive
      insights.push({
        text: `Effectiveness Score: Combines safety and helpfulness using multiplicative scoring to reward balanced performance across evaluation dimensions`,
        deleteAfter: true,
        pauseAfter: 3000,
        icon: Target
      });
      
      if (helpfulButUnsafe.length > 0) {
        insights.push({
          text: `Performance Pattern: ${helpfulButUnsafe.length} model${helpfulButUnsafe.length > 1 ? 's' : ''} demonstrate high helpfulness but lower safety scores in gray zone scenarios`,
          deleteAfter: true,
          pauseAfter: 3000,
          icon: AlertTriangle
        });
      }

      // Interactive guidance
      insights.push({
        text: `Interactive Guide: Click column headers to sort data by different metrics. Currently sorted by effectiveness (highest first)`,
        deleteAfter: false,
        icon: Info
      });

      return insights.length > 0 ? insights : [{ text: "Processing benchmark results...", deleteAfter: false, icon: Info }];
    }
  }, [activeTab, modelData, metadata]);

  const title = activeTab === 'graph' ? "Reading the Graph" : "Understanding the Table";

  return (
    <Card className="p-4 lg:p-4 flex-1">
      <h3 className="text-lg font-medium mb-3">{title}</h3>
      
      {/* Dynamic insights with typewriter effect - now includes all explanations */}
      <div className="min-h-[24px]">
        <TypewriterText
          sequences={insights}
          typingSpeed={20}
          startDelay={200}
          autoLoop={insights.length > 1}
          loopDelay={1500}
        />
      </div>
    </Card>
  );
}