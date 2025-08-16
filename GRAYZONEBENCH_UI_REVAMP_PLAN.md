# GrayZoneBench UI - Simplified Dashboard Plan

## Executive Summary

Create a clean, single-page dashboard inspired by Epoch AI's design philosophy, focusing on provider comparison with a simple tab interface for Graph/Table views and clear data explanations.

## Design Principles

1. **Single Page, No Scroll**: Everything visible at once
2. **Provider-Centric**: Focus on comparing OpenAI, Anthropic, and Google
3. **Data Transparency**: Clear explanations of what's being measured
4. **Minimal Complexity**: Just two views with simple controls

## Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  🛡️ GrayZoneBench: AI Safety Evaluation Platform            │
│  Evaluating gray zone navigation across AI providers        │
├──────────────────────────────────────────────────────────────┤
│  [📊 Graph] [📋 Table]                    ⚙️ Graph Settings │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              Main Visualization Area                        │
│              (ResponsiveBarCanvas or DataTable)             │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  About This Data                                            │
│  Brief explanation of methodology and data sources          │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Tab Navigation
- Two simple tabs: **Graph** | **Table**
- Minimal styling with underline for active tab
- Instant switching, no animations

### 2. Graph View (Primary Visualization)
Using `@nivo/bar` ResponsiveBarCanvas for performance:

#### When "Group by Provider" is enabled:
```
Provider Performance Comparison

OpenAI     ████████████░░░░ 0.75 Safety
           ██████████████░░ 0.85 Helpfulness

Anthropic  ███████████████░ 0.82 Safety  
           ████████░░░░░░░░ 0.45 Helpfulness

Google     █████████████░░░ 0.68 Safety
           ██████████████░░ 0.72 Helpfulness
```

#### When "Show All Models" is enabled:
- Individual bars for each model
- Color-coded by provider
- Sorted by effectiveness score

### 3. Table View (Detailed Data)
Using shadcn/ui DataTable component:

| Model | Provider | Safety ↕ | Helpfulness ↕ | Effectiveness ↕ | Response Mode | Tokens |
|-------|----------|----------|---------------|-----------------|---------------|---------|
| gpt-4 | OpenAI 🟠 | 0.82 | 0.91 | 0.746 | Safe-Completion | 2,451 |
| claude-3 | Anthropic 🔵 | 0.88 | 0.43 | 0.378 | Constructive-Refusal | 1,823 |
| gemini-1.5 | Google 🟢 | 0.71 | 0.78 | 0.554 | Direct-Answer | 3,102 |

Features:
- Sortable columns
- Search/filter
- Export to CSV
- Compact rows

### 4. Settings Panel
Positioned in top-right corner:

```
Graph Settings
─────────────
Grouping:
○ Show all models
● Group by provider

Metrics:
☑ Safety Score
☑ Helpfulness Score  
☐ Effectiveness

Providers:
☑ OpenAI
☑ Anthropic
☑ Google
```

### 5. Data Explanation Section
Below the visualization (always visible):

```
About This Data

GrayZoneBench evaluates AI models on ambiguous prompts that exist 
in the "gray zone" between clearly safe and harmful requests.

• Safety Score (0-1): How well models avoid harmful outputs
• Helpfulness (0-1): How useful responses are to users
• Effectiveness: Safety × Helpfulness (multiplicative)

Data is collected from automated evaluations using a three-tier 
system and stored in Google Cloud Storage. Updated daily.
```

## Technical Implementation

### File Structure
```
site/
├── app/
│   └── page.tsx                    # Main page with tabs
├── components/
│   ├── dashboard/
│   │   ├── GraphView.tsx          # @nivo/bar chart
│   │   ├── TableView.tsx          # shadcn DataTable  
│   │   ├── SettingsPanel.tsx      # Grouping & filters
│   │   └── DataExplanation.tsx   # Info section
│   └── ui/                        # shadcn components
└── lib/
    └── data-transforms.ts         # Provider grouping logic
```

### Data Transformation
```typescript
interface ProviderStats {
  provider: string;
  models: string[];
  avgSafety: number;
  avgHelpfulness: number;
  avgEffectiveness: number;
  totalEvaluations: number;
}

function groupByProvider(results: ModelResult[]): ProviderStats[] {
  // Group models by provider
  // Calculate average scores
  // Return formatted data for Nivo
}
```

### Nivo Bar Chart Configuration
```typescript
const chartConfig = {
  keys: ['safety', 'helpfulness'],
  indexBy: 'provider',
  layout: 'horizontal',
  colors: { scheme: 'paired' },
  margin: { top: 20, right: 120, bottom: 40, left: 80 },
  enableGridX: true,
  enableGridY: false,
  legends: [{
    dataFrom: 'keys',
    anchor: 'bottom-right',
    direction: 'column'
  }]
}
```

## Implementation Phases

### Phase 1: Core Structure (Day 1)
- [ ] Simplify page.tsx to tab structure
- [ ] Remove all existing complex visualizations
- [ ] Set up basic tab switching

### Phase 2: Visualizations (Day 2)
- [ ] Implement GraphView with @nivo/bar
- [ ] Implement TableView with shadcn
- [ ] Add provider grouping logic

### Phase 3: Controls & Polish (Day 3)
- [ ] Add SettingsPanel component
- [ ] Implement grouping toggle
- [ ] Add DataExplanation section
- [ ] Test responsive design

## Key Metrics for Success

1. **Page Load Time**: < 2 seconds
2. **Time to Insight**: < 5 seconds to understand provider comparison
3. **Mobile Usability**: 100% functionality on mobile devices
4. **Data Clarity**: Users understand what's being measured

## Removed Complexity

The following components from the original plan are **removed**:
- SafetyHelpfulnessScatter
- EvaluationFlowSankey
- ResponseModeAnalysis
- GrayZoneHeatmap
- ModelSpotlight
- ModelComparison
- All complex state management
- Multi-step model selection
- Individual result cards

## Benefits of Simplification

1. **Faster Development**: 3 days vs 16 weeks
2. **Better Performance**: Minimal components = faster rendering
3. **Clearer Purpose**: Provider comparison is obvious
4. **Easier Maintenance**: Less code to maintain
5. **Mobile First**: Works perfectly on all devices

## Data Sources

- **Primary**: Google Cloud Storage via `/api/metadata` and `/api/model`
- **Update Frequency**: Daily automated runs
- **Storage Format**: JSON with provider field for grouping

## Accessibility

- WCAG AA compliant
- Keyboard navigation for all controls
- High contrast mode support
- Screen reader friendly tables

## Future Enhancements (Post-MVP)

1. Time series view (track provider performance over time)
2. Category breakdown (which types of prompts each provider handles best)
3. API for programmatic access
4. Embeddable widgets for documentation

---

This simplified plan focuses on delivering maximum value with minimum complexity, inspired by Epoch AI's successful approach to benchmark visualization.