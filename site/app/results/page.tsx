/**
 * GrayZoneBench Results Viewer
 * Fetches and displays benchmark results from Google Cloud Storage
 * Uses server-side rendering with Next.js canary caching
 */

import { fetchLatestResults, fetchRunsList } from '@/lib/fetch-results';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ModelPerformanceCharts } from '@/components/charts/ModelPerformanceCharts';
import { Shield, Database, Clock, TrendingUp, BarChart3 } from 'lucide-react';

// Type definitions for our data structures
interface BenchmarkResult {
  model: string;
  safety?: string;
  helpfulness?: number;
  detailed_safety_score?: number;
  detailed_helpfulness_score?: number;
}

interface ModelStats {
  model: string;
  avgSafety: number;
  avgHelp: number;
  effectiveness: number;
  prompts: number;
}

interface RunInfo {
  timestamp: string;
  models: string[];
  num_prompts: number;
  uploaded_at?: string;
}

interface RunsList {
  runs: RunInfo[];
}

export default async function ResultsPage() {
  // Fetch data in parallel using Promise.all
  const [latestResults, runsList] = await Promise.all([
    fetchLatestResults(),
    fetchRunsList()
  ]);

  // Handle connection errors
  if (!latestResults) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <Database className="h-4 w-4" />
          <AlertDescription>
            Failed to connect to Google Cloud Storage. Please check your configuration and ensure 
            GCS_SERVICE_ACCOUNT and GCS_BUCKET_NAME environment variables are set correctly.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Process results to get summary statistics
  const modelSet = new Set((latestResults as BenchmarkResult[]).map((r) => r.model));
  const modelCount = modelSet.size;
  
  // Calculate average scores (handle both detailed and legacy format)
  const validSafetyScores = (latestResults as BenchmarkResult[])
    .map((r) => r.detailed_safety_score || (r.safety === 'SAFE' ? 0.8 : 0.3))
    .filter((score) => score != null);
  
  const validHelpScores = (latestResults as BenchmarkResult[])
    .map((r) => r.detailed_helpfulness_score || (r.helpfulness ? r.helpfulness / 4.0 : 0.5))
    .filter((score) => score != null);

  const avgSafety = validSafetyScores.length > 0 
    ? validSafetyScores.reduce((a, b) => a + b, 0) / validSafetyScores.length 
    : 0;
    
  const avgHelpfulness = validHelpScores.length > 0
    ? validHelpScores.reduce((a, b) => a + b, 0) / validHelpScores.length
    : 0;

  // Group results by model for performance table
  const modelResults = (latestResults as BenchmarkResult[]).reduce((acc: Record<string, {
    model: string;
    count: number;
    totalSafety: number;
    totalHelp: number;
    safetyScores: number[];
    helpScores: number[];
  }>, result) => {
    const model = result.model;
    if (!acc[model]) {
      acc[model] = {
        model,
        count: 0,
        totalSafety: 0,
        totalHelp: 0,
        safetyScores: [],
        helpScores: []
      };
    }
    
    acc[model].count++;
    
    const safetyScore = result.detailed_safety_score || (result.safety === 'SAFE' ? 0.8 : 0.3);
    const helpScore = result.detailed_helpfulness_score || (result.helpfulness ? result.helpfulness / 4.0 : 0.5);
    
    if (safetyScore != null) {
      acc[model].totalSafety += safetyScore;
      acc[model].safetyScores.push(safetyScore);
    }
    
    if (helpScore != null) {
      acc[model].totalHelp += helpScore;
      acc[model].helpScores.push(helpScore);
    }
    
    return acc;
  }, {});

  const modelStats: ModelStats[] = Object.values(modelResults).map((m) => ({
    model: m.model,
    avgSafety: m.safetyScores.length > 0 ? m.totalSafety / m.safetyScores.length : 0,
    avgHelp: m.helpScores.length > 0 ? m.totalHelp / m.helpScores.length : 0,
    effectiveness: m.safetyScores.length > 0 && m.helpScores.length > 0 
      ? (m.totalSafety / m.safetyScores.length) * (m.totalHelp / m.helpScores.length)
      : 0,
    prompts: m.count
  })).sort((a, b) => b.effectiveness - a.effectiveness); // Sort by effectiveness descending

  // Get the most recent run info
  const latestRun: RunInfo = (runsList as RunsList).runs[0] || { timestamp: 'Unknown', models: [], num_prompts: 0, uploaded_at: undefined };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-4 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">GrayZoneBench Results</h1>
            <p className="text-muted-foreground text-sm sm:text-base">AI Safety Evaluation Dashboard</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-chart-1 border-chart-1/20">
            <Database className="w-3 h-3 mr-1" />
            Connected to GCS
          </Badge>
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {latestRun.uploaded_at 
              ? `Updated: ${new Date(latestRun.uploaded_at).toLocaleDateString()}`
              : 'Data from GCS'
            }
          </Badge>
          <Badge variant="outline">
            <TrendingUp className="w-3 h-3 mr-1" />
            {latestResults.length} Total Results
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modelCount}</div>
            <p className="text-sm text-muted-foreground">Evaluated models</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Safety Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgSafety > 0.7 ? 'text-chart-1' : avgSafety > 0.5 ? 'text-chart-2' : 'text-destructive'}`}>
              {(avgSafety * 100).toFixed(1)}%
            </div>
            <Progress 
              value={avgSafety * 100} 
              className="mt-2 h-2" 
            />
            <p className="text-sm text-muted-foreground mt-2">Average safety</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Helpfulness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgHelpfulness > 0.7 ? 'text-chart-3' : avgHelpfulness > 0.5 ? 'text-chart-2' : 'text-destructive'}`}>
              {(avgHelpfulness * 100).toFixed(1)}%
            </div>
            <Progress 
              value={avgHelpfulness * 100} 
              className="mt-2 h-2" 
            />
            <p className="text-sm text-muted-foreground mt-2">Average helpfulness</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(avgSafety * avgHelpfulness) > 0.6 ? 'text-chart-4' : 'text-muted-foreground'}`}>
              {((avgSafety * avgHelpfulness) * 100).toFixed(1)}%
            </div>
            <Progress 
              value={(avgSafety * avgHelpfulness) * 100} 
              className="mt-2 h-2" 
            />
            <p className="text-sm text-muted-foreground mt-2">Safety × Helpfulness</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Performance Ranking</CardTitle>
          <p className="text-sm text-muted-foreground">
            Models ranked by effectiveness (safety × helpfulness)
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Safety</TableHead>
                <TableHead className="text-right">Helpfulness</TableHead>
                <TableHead className="text-right">Effectiveness</TableHead>
                <TableHead className="text-right">Prompts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelStats.map((model, index) => (
                <TableRow key={model.model}>
                  <TableCell>
                    <Badge variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}>
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{model.model}</TableCell>
                  <TableCell className="text-right">
                    <span className={model.avgSafety > 0.7 ? 'text-chart-1' : model.avgSafety > 0.5 ? 'text-chart-2' : 'text-destructive'}>
                      {(model.avgSafety * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={model.avgHelp > 0.7 ? 'text-chart-3' : model.avgHelp > 0.5 ? 'text-chart-2' : 'text-destructive'}>
                      {(model.avgHelp * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={model.effectiveness > 0.6 ? 'text-chart-4 font-bold' : 'text-muted-foreground'}>
                      {(model.effectiveness * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{model.prompts}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Data Visualizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Model Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ModelPerformanceCharts modelStats={modelStats} />
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Benchmark Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runsList.runs.length > 0 ? (
            <div className="space-y-3">
              {(runsList as RunsList).runs.slice(0, 5).map((run, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50">
                  <div>
                    <div className="font-medium">{run.timestamp}</div>
                    <div className="text-sm text-muted-foreground">
                      {run.uploaded_at 
                        ? `Uploaded: ${new Date(run.uploaded_at).toLocaleString()}`
                        : 'Upload time unknown'
                      }
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{run.models.length} models</Badge>
                    <Badge variant="secondary">{run.num_prompts} prompts</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent runs found.</p>
          )}
        </CardContent>
      </Card>

      {/* Raw JSON Preview (Collapsible) */}
      <details className="border rounded-lg p-4 bg-muted/50">
        <summary className="cursor-pointer font-medium text-lg mb-2">
          🔍 Raw JSON Preview (Debug)
        </summary>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Sample Results (first 2 entries):</h4>
            <pre className="p-4 bg-background border rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(latestResults.slice(0, 2), null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Runs Index:</h4>
            <pre className="p-4 bg-background border rounded overflow-auto max-h-48 text-xs">
              {JSON.stringify(runsList, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}