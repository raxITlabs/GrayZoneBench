/**
 * Accessible Three-Tier Evaluation Pipeline Visualization
 * Uses React Flow with WCAG AAA compliance and mobile support
 */

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  NodeTypes,
  Panel,
} from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Settings, Brain, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { CompleteModelResult, EvaluationNode, EvaluationEdge } from '@/types/evaluation';
import 'reactflow/dist/style.css';

interface AccessiblePipelineProps {
  selectedResult?: CompleteModelResult;
  className?: string;
}

// Custom node components with accessibility features
const DeterministicNode = ({ data, selected }: any) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`Deterministic tier: ${data.label}`}
    aria-describedby={`deterministic-desc-${data.id}`}
    className={`
      relative p-4 rounded-lg border-2 min-w-[200px] min-h-[120px]
      bg-chart-1 border-chart-1 text-primary-foreground
      focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      ${selected ? 'ring-2 ring-ring' : ''}
      ${data.used ? 'opacity-100' : 'opacity-60'}
      transition-all duration-200 cursor-pointer
      hover:scale-105 active:scale-95
    `}
    style={{ minHeight: '44px' }} // WCAG touch target
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-md bg-primary-foreground/20">
        <Settings className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{data.label}</h3>
        <p className="text-xs opacity-90 mt-1">Rule-based analysis</p>
        {data.score !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between items-center text-xs">
              <span>Score:</span>
              <span className="font-mono">{(data.score * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={data.score * 100} 
              className="mt-1 h-1.5 bg-primary-foreground/20"
            />
          </div>
        )}
      </div>
    </div>
    {data.used && (
      <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-green-500 bg-white rounded-full" />
    )}
    <div id={`deterministic-desc-${data.id}`} className="sr-only">
      Deterministic analysis using rule-based patterns and heuristics.
      {data.used ? ' This tier was used for the final decision.' : ' This tier was not used for the final decision.'}
    </div>
  </div>
);

const ModerationNode = ({ data, selected }: any) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`Moderation API tier: ${data.label}`}
    aria-describedby={`moderation-desc-${data.id}`}
    className={`
      relative p-4 rounded-lg border-2 min-w-[200px] min-h-[120px]
      bg-chart-5 border-chart-5 text-primary-foreground
      focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      ${selected ? 'ring-2 ring-ring' : ''}
      ${data.used ? 'opacity-100' : 'opacity-60'}
      transition-all duration-200 cursor-pointer
      hover:scale-105 active:scale-95
    `}
    style={{ minHeight: '44px' }}
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-md bg-primary-foreground/20">
        <Shield className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{data.label}</h3>
        <p className="text-xs opacity-90 mt-1">API-based filtering</p>
        {data.score !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between items-center text-xs">
              <span>Confidence:</span>
              <span className="font-mono">{(data.confidence * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={data.confidence * 100} 
              className="mt-1 h-1.5 bg-primary-foreground/20"
            />
          </div>
        )}
      </div>
    </div>
    {data.used && (
      <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-green-500 bg-white rounded-full" />
    )}
    <div id={`moderation-desc-${data.id}`} className="sr-only">
      Moderation API analysis using external content filtering services.
      {data.used ? ' This tier was used for the final decision.' : ' This tier was not used for the final decision.'}
    </div>
  </div>
);

const AgentNode = ({ data, selected }: any) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`Agent LLM tier: ${data.label}`}
    aria-describedby={`agent-desc-${data.id}`}
    className={`
      relative p-4 rounded-lg border-2 min-w-[200px] min-h-[120px]
      bg-chart-2 border-chart-2 text-secondary-foreground
      focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      ${selected ? 'ring-2 ring-ring' : ''}
      ${data.used ? 'opacity-100' : 'opacity-60'}
      transition-all duration-200 cursor-pointer
      hover:scale-105 active:scale-95
    `}
    style={{ minHeight: '44px' }}
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-md bg-secondary-foreground/20">
        <Brain className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{data.label}</h3>
        <p className="text-xs opacity-90 mt-1">LLM judge analysis</p>
        {data.score !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between items-center text-xs">
              <span>Effectiveness:</span>
              <span className="font-mono">{(data.score * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={data.score * 100} 
              className="mt-1 h-1.5 bg-secondary-foreground/20"
            />
          </div>
        )}
      </div>
    </div>
    {data.used && (
      <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-green-500 bg-white rounded-full" />
    )}
    <div id={`agent-desc-${data.id}`} className="sr-only">
      Agent-based LLM analysis providing detailed reasoning and scoring.
      {data.used ? ' This tier was used for the final decision.' : ' This tier was not used for the final decision.'}
    </div>
  </div>
);

const ResultNode = ({ data, selected }: any) => {
  const getSafetyIcon = () => {
    if (data.safety > 0.7) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (data.safety > 0.4) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div
      role="region"
      aria-label={`Final evaluation result`}
      aria-describedby={`result-desc-${data.id}`}
      className={`
        relative p-4 rounded-lg border-2 min-w-[240px] min-h-[140px]
        bg-card border-border text-card-foreground
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${selected ? 'ring-2 ring-ring' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1">
          {getSafetyIcon()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Final Result</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-muted-foreground">Safety</p>
              <p className="text-sm font-mono">{(data.safety * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Helpfulness</p>
              <p className="text-sm font-mono">{(data.helpfulness * 100).toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Effectiveness</p>
            <p className="text-sm font-mono">{((data.safety * data.helpfulness) * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
      <div id={`result-desc-${data.id}`} className="sr-only">
        Final evaluation result combining safety and helpfulness scores.
        Safety: {(data.safety * 100).toFixed(1)}%, 
        Helpfulness: {(data.helpfulness * 100).toFixed(1)}%, 
        Overall effectiveness: {((data.safety * data.helpfulness) * 100).toFixed(1)}%
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  deterministic: DeterministicNode,
  moderation: ModerationNode,
  agent: AgentNode,
  result: ResultNode,
};

export function AccessiblePipeline({ selectedResult, className = '' }: AccessiblePipelineProps) {
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Create nodes and edges based on selected result
  const { nodes, edges } = useMemo(() => {
    if (!selectedResult) {
      // Default empty state
      return {
        nodes: [
          {
            id: 'deterministic',
            type: 'deterministic',
            position: { x: 50, y: 100 },
            data: { label: 'Deterministic Analysis', used: false, tier: 'deterministic' }
          },
          {
            id: 'moderation',
            type: 'moderation',
            position: { x: 300, y: 100 },
            data: { label: 'Moderation API', used: false, tier: 'moderation' }
          },
          {
            id: 'agent',
            type: 'agent',
            position: { x: 550, y: 100 },
            data: { label: 'Agent LLM', used: false, tier: 'agent' }
          },
          {
            id: 'result',
            type: 'result',
            position: { x: 300, y: 280 },
            data: { label: 'Result', safety: 0.5, helpfulness: 0.5 }
          }
        ],
        edges: [
          { id: 'e1', source: 'deterministic', target: 'result', animated: false },
          { id: 'e2', source: 'moderation', target: 'result', animated: false },
          { id: 'e3', source: 'agent', target: 'result', animated: false }
        ]
      };
    }

    const judge = selectedResult.judge;
    const safetyScores = judge.safety_raw.final_scores;
    const helpfulnessScores = judge.helpfulness_raw.final_scores;

    const nodes: Node[] = [
      {
        id: 'deterministic',
        type: 'deterministic',
        position: { x: 50, y: 100 },
        data: {
          id: 'deterministic',
          label: 'Deterministic Analysis',
          score: judge.safety_raw.deterministic_features.safety_score,
          confidence: judge.safety_raw.deterministic_features.confidence,
          used: true, // All tiers are used in the current system
          tier: 'deterministic',
          details: judge.safety_raw.deterministic_features
        }
      },
      {
        id: 'moderation',
        type: 'moderation',
        position: { x: 300, y: 100 },
        data: {
          id: 'moderation',
          label: 'Moderation API',
          confidence: 0.9, // Moderation APIs typically have high confidence
          used: true,
          tier: 'moderation',
          details: {} // Could extract moderation-specific data if available
        }
      },
      {
        id: 'agent',
        type: 'agent',
        position: { x: 550, y: 100 },
        data: {
          id: 'agent',
          label: 'Agent LLM',
          score: safetyScores.gray_zone_effectiveness,
          confidence: judge.safety_raw.deterministic_features.confidence,
          used: true,
          tier: 'agent',
          details: judge.safety_raw.consensus_result
        }
      },
      {
        id: 'result',
        type: 'result',
        position: { x: 300, y: 280 },
        data: {
          id: 'result',
          label: 'Final Result',
          safety: safetyScores.safety,
          helpfulness: helpfulnessScores.helpfulness,
          effectiveness: safetyScores.gray_zone_effectiveness
        }
      }
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'deterministic',
        target: 'result',
        animated: true,
        style: { strokeWidth: 2 },
        data: { used: true }
      },
      {
        id: 'e2',
        source: 'moderation',
        target: 'result',
        animated: true,
        style: { strokeWidth: 2 },
        data: { used: true }
      },
      {
        id: 'e3',
        source: 'agent',
        target: 'result',
        animated: true,
        style: { strokeWidth: 2 },
        data: { used: true }
      }
    ];

    return { nodes, edges };
  }, [selectedResult]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // Could trigger a modal or side panel with detailed information
  }, []);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Three-Tier Evaluation Pipeline
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive visualization of the evaluation process
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMiniMap(!showMiniMap)}
              aria-pressed={showMiniMap}
              aria-label="Toggle mini map"
            >
              Mini Map
            </Button>
          </div>
        </div>
        
        {selectedResult && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline">{selectedResult.model}</Badge>
            <Badge variant="outline">{selectedResult.category}</Badge>
            <Badge 
              variant={selectedResult.judge.safety_raw.gray_zone_navigation.response_mode === 'constructive-refusal' ? 'default' : 'secondary'}
            >
              {selectedResult.judge.safety_raw.gray_zone_navigation.response_mode}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="h-[400px] w-full" role="img" aria-label="Three-tier evaluation pipeline flow diagram">
          <ReactFlow
            nodes={nodesState}
            edges={edgesState}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Strict}
            fitView
            minZoom={0.5}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls 
              showZoom={true}
              showFitView={true}
              showInteractive={false}
              style={{ 
                button: { 
                  minWidth: '44px', 
                  minHeight: '44px',
                  borderRadius: '6px'
                }
              }}
            />
            {showMiniMap && (
              <MiniMap
                style={{
                  backgroundColor: 'var(--muted)',
                  border: '1px solid var(--border)'
                }}
                nodeColor="var(--primary)"
                maskColor="rgba(0, 0, 0, 0.2)"
              />
            )}
            <Panel position="top-left" className="bg-background/80 backdrop-blur-sm rounded-md p-2">
              <div className="text-xs text-muted-foreground">
                <p><strong>Legend:</strong></p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-3 h-3 rounded bg-chart-1"></div>
                  <span>Deterministic</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-chart-5"></div>
                  <span>Moderation</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-chart-2"></div>
                  <span>Agent</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
        
        {!selectedResult && (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Evaluation Selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a model result to see the detailed three-tier evaluation pipeline
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}