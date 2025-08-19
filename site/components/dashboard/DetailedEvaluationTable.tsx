/**
 * DetailedEvaluationTable Component - Comprehensive Google Sheets-style evaluation data table
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProviderLogo } from '@/components/ui/provider-logo';
import { 
  Search, 
  Download, 
  ArrowUpDown, 
  Eye, 
  EyeOff, 
  Settings,
  Filter,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pagination, usePagination, shouldShowPagination } from '@/components/ui/pagination';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import type { DetailedEvaluationTableRow, ColumnGroup, SampleEvaluation } from '@/types/comprehensive-evaluation';
import { 
  prepareDetailedTableData, 
  getColumnGroups, 
  getTableColumnConfig,
  extractAllSampleEvaluations
} from '@/libs/comprehensive-data-transforms';
import { getResponseModeBadgeProps, getScoreColorClass, formatScore, formatNumber } from '@/lib/utils';
import { SampleDetailsModal } from '@/components/evaluation/SampleDetailsModal';
import { RationaleFormatter } from '@/components/evaluation/RationaleFormatter';

interface DetailedEvaluationTableProps {
  metadata: BenchmarkMetadata | null;
  modelData: Record<string, ModelData>;
  selectedProviders: string[];
}

type SortField = keyof DetailedEvaluationTableRow;
type SortDirection = 'asc' | 'desc';

export function DetailedEvaluationTable({
  metadata,
  modelData,
  selectedProviders
}: DetailedEvaluationTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('effectiveness');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({
    core: true,
    confidence: true,
    tiers: true,
    samples: true,
    response: false,
    harm: false,
    technical: false
  });

  // Get column configuration
  const columnGroups = useMemo(() => getColumnGroups(), []);
  const columnConfig = useMemo(() => getTableColumnConfig(), []);

  // Prepare and filter data (all data, before pagination)
  const allTableData = useMemo(() => {
    if (!metadata || Object.keys(modelData).length === 0) return [];
    
    let data = prepareDetailedTableData(modelData, selectedProviders);
    
    // Apply search filter
    if (searchTerm) {
      data = data.filter(row => 
        row.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.responseMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.facilitationLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.harmLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.tierUsed.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    data.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      // Handle string sorting
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return data;
  }, [metadata, modelData, selectedProviders, searchTerm, sortField, sortDirection]);

  // Set up pagination
  const {
    paginatedData: tableData,
    pagination,
    onPageChange,
    onPageSizeChange
  } = usePagination(allTableData, 10);

  // Get visible columns based on group visibility
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(col => visibleGroups[col.groupId]);
  }, [columnConfig, visibleGroups]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleGroupVisibility = (groupId: string) => {
    setVisibleGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleRowExpansion = (modelName: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelName)) {
        newSet.delete(modelName);
      } else {
        newSet.add(modelName);
      }
      return newSet;
    });
  };

  const openSampleModal = (modelName: string) => {
    setSelectedModel(modelName);
    setModalOpen(true);
  };

  const getSamplePreview = (modelName: string): string => {
    const modelSamples = modelData[modelName];
    if (!modelSamples?.results) return '';
    
    const firstSample = Object.values(modelSamples.results)[0];
    
    // Try multiple paths to find the prompt
    let prompt = '';
    const agentRaw = firstSample?.safety_tier_results?.agent?.raw;
    
    if (agentRaw?.prompt) {
      prompt = agentRaw.prompt;
    } else if (agentRaw?.consensus_result?.prompt) {
      prompt = agentRaw.consensus_result.prompt;
    } else if ((firstSample as any)?.prompt) {
      prompt = (firstSample as any).prompt;
    }
    
    if (!prompt) return 'No prompt data available';
    
    // Security masking for dangerous prompts - check response mode
    const responseMode = agentRaw?.consensus_result?.gray_zone_result?.response_mode ||
                        agentRaw?.gray_zone_navigation?.response_mode ||
                        firstSample?.safety_tier_results?.deterministic?.response_mode ||
                        'unknown';
    
    if (responseMode === 'direct-answer') {
      return '**** Content hidden for security ****';
    }
    
    return prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '');
  };

  const getSampleEvaluations = (modelName: string): SampleEvaluation[] => {
    if (!modelData[modelName]) return [];
    return extractAllSampleEvaluations(modelData[modelName]);
  };

  // Helper function to get exportable columns (exclude UI-only columns)
  const getExportableColumns = () => {
    return visibleColumns.filter(col => 
      !['sampleActions', 'samplePreview'].includes(col.id) // Exclude UI-only columns
    );
  };

  // Helper function to sanitize data for export (mask dangerous content)
  const sanitizeDataForExport = (row: DetailedEvaluationTableRow, columnId: string, value: any) => {
    // Currently no sanitization needed for exported columns
    // (samplePreview with security concerns is excluded from exports)
    return value;
  };

  const handleExportCSV = () => {
    const exportColumns = getExportableColumns();
    const headers = exportColumns.map(col => col.label);
    const csvContent = [
      headers.join(','),
      // Use all data, not just current page
      ...allTableData.map(row => 
        exportColumns.map(col => {
          let value = row[col.id];
          // Apply security sanitization
          value = sanitizeDataForExport(row, col.id, value);
          
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          if (typeof value === 'number') {
            if (col.type === 'percentage') return formatScore(value as number);
            return value.toString();
          }
          return value?.toString() || '';
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detailed-grayzonebench-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRawData = () => {
    // Create sanitized version of modelData with security masking
    const sanitizedData: any = {};
    
    Object.entries(modelData).forEach(([modelName, data]) => {
      sanitizedData[modelName] = {
        ...data,
        results: Object.fromEntries(
          Object.entries(data.results || {}).map(([key, result]) => {
            // Apply security masking to prompts/responses for direct-answer cases
            const agentRaw = (result as any)?.safety_tier_results?.agent?.raw;
            const responseMode = agentRaw?.consensus_result?.gray_zone_result?.response_mode ||
                               agentRaw?.gray_zone_navigation?.response_mode ||
                               (result as any)?.safety_tier_results?.deterministic?.response_mode ||
                               'unknown';
            
            let sanitizedResult = { ...result };
            
            if (responseMode === 'direct-answer' && agentRaw) {
              // Create a deep copy and mask sensitive data
              sanitizedResult = JSON.parse(JSON.stringify(result));
              if (sanitizedResult.safety_tier_results?.agent?.raw) {
                sanitizedResult.safety_tier_results.agent.raw.prompt = '**** Content hidden for security ****';
                sanitizedResult.safety_tier_results.agent.raw.response = '**** Content hidden for security ****';
              }
            }
            
            return [key, sanitizedResult];
          })
        )
      };
    });

    // Create download object with metadata
    const downloadData = {
      metadata: {
        exported_at: new Date().toISOString(),
        models_count: Object.keys(modelData).length,
        note: 'Raw evaluation data with security masking applied for direct-answer responses'
      },
      models: sanitizedData
    };

    // Create and download file
    const jsonContent = JSON.stringify(downloadData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grayzonebench-raw-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    const exportColumns = getExportableColumns();
    const headers = exportColumns.map(col => col.label);
    const separator = headers.map(() => '---').join('|');
    
    const markdownContent = [
      `| ${headers.join(' | ')} |`,
      `|${separator}|`,
      // Use all data, not just current page
      ...allTableData.map(row => 
        `| ${exportColumns.map(col => {
          let value = row[col.id];
          // Apply security sanitization
          value = sanitizeDataForExport(row, col.id, value);
          
          if (col.id === 'responseMode') {
            const badgeProps = getResponseModeBadgeProps(value as string);
            return badgeProps.formattedMode;
          }
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          if (typeof value === 'number') {
            if (col.type === 'percentage') return formatScore(value as number);
            return formatNumber(value as number);
          }
          return value?.toString() || '';
        }).join(' | ')} |`
      )
    ].join('\n');
    
    try {
      await navigator.clipboard.writeText(markdownContent);
      setMarkdownCopied(true);
      setTimeout(() => setMarkdownCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = markdownContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setMarkdownCopied(true);
      setTimeout(() => setMarkdownCopied(false), 2000);
    }
  };

  // Formatting functions
  const formatValue = (value: any, type: string) => {
    switch (type) {
      case 'percentage':
        return formatScore(value as number);
      case 'number':
        return formatNumber(value as number);
      case 'boolean':
        return value ? <CheckCircle className="w-4 h-4 text-chart-1" /> : <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'date':
        return new Date(value as string).toLocaleDateString();
      default:
        return value?.toString() || '';
    }
  };


  const formatResponseMode = (mode: string) => {
    return mode.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const SortableHeader = ({ column }: { column: typeof columnConfig[0] }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap ${
        column.sticky ? 'sticky left-0 bg-background z-20 border-r' : ''
      }`}
      onClick={() => column.sortable && handleSort(column.id)}
      style={{ minWidth: column.width || 100 }}
    >
      <div className="flex items-center gap-1">
        {column.label}
        {column.sortable && <ArrowUpDown className="w-3 h-3 opacity-50" />}
      </div>
    </TableHead>
  );

  if (tableData.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No detailed evaluation data available for selected filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Detailed Evaluation Table</h3>
        <Badge variant="outline" className="text-sm">
          {shouldShowPagination(allTableData.length) 
            ? `${tableData.length} of ${allTableData.length} models`
            : `${allTableData.length} models`} • {visibleColumns.length} columns
        </Badge>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models, providers, modes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Column Group Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Column Groups</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columnGroups.map((group) => (
                <DropdownMenuCheckboxItem
                  key={group.id}
                  checked={visibleGroups[group.id]}
                  onCheckedChange={() => toggleGroupVisibility(group.id)}
                >
                  <div className="flex justify-between items-center w-full">
                    <span>{group.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.columns.length}
                    </Badge>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
          {isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyMarkdown}
                  disabled={markdownCopied}
                  className={markdownCopied ? 'text-chart-1 border-chart-1' : ''}
                >
                  {markdownCopied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{markdownCopied ? 'Copied!' : 'Copy as Markdown'}</TooltipContent>
            </Tooltip>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyMarkdown}
              disabled={markdownCopied}
              className={markdownCopied ? 'text-chart-1 border-chart-1' : ''}
            >
              {markdownCopied ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {markdownCopied ? 'Copied!' : 'Copy Markdown'}
            </Button>
          )}
          {isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleDownloadRawData}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download Raw Data</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="outline" size="sm" onClick={handleDownloadRawData}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Download Raw Data
            </Button>
          )}
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="w-full overflow-hidden">
        <div className="border rounded-md overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <SortableHeader key={column.id} column={column} />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <React.Fragment key={row.model}>
                  <TableRow className="hover:bg-muted/50">
                    {visibleColumns.map((column) => {
                      const value = row[column.id];
                      const isSticky = column.sticky;
                      
                      return (
                        <TableCell 
                          key={column.id} 
                          className={`whitespace-nowrap ${
                            isSticky ? 'sticky left-0 bg-background z-10 border-r' : ''
                          } ${column.id === 'model' ? 'font-medium' : ''}`}
                          style={{ minWidth: column.width || 100 }}
                        >
                          {/* Special rendering for specific columns */}
                          {column.id === 'model' && (
                            <div className="font-medium">{value as string}</div>
                          )}
                          
                          {column.id === 'provider' && (
                            <div className="flex items-center gap-2">
                              <ProviderLogo provider={value as string} size={20} />
                              <span className="text-sm font-medium">{value as string}</span>
                            </div>
                          )}
                          
                          {column.id === 'responseMode' && (() => {
                            const badgeProps = getResponseModeBadgeProps(value as string);
                            return (
                              <Badge variant={badgeProps.variant} className={`text-sm ${badgeProps.className}`}>
                                {badgeProps.formattedMode}
                              </Badge>
                            );
                          })()}
                          
                          {column.id === 'tierUsed' && (
                            <Badge variant="outline" className="text-xs">
                              {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
                            </Badge>
                          )}
                          
                          {column.id === 'facilitationLevel' && (
                            <Badge 
                              variant={value === 'negligible' ? 'secondary' : 'destructive'} 
                              className="text-xs"
                            >
                              {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
                            </Badge>
                          )}
                          
                          {column.id === 'harmLevel' && (
                            <Badge 
                              variant={value === 'negligible' ? 'secondary' : 'destructive'} 
                              className="text-xs"
                            >
                              {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
                            </Badge>
                          )}
                          
                          {/* Score columns with color coding */}
                          {(['safety', 'helpfulness', 'effectiveness'].includes(column.id)) && (
                            <span className={`font-mono ${getScoreColorClass(
                              value as number, 
                              column.id === 'effectiveness' ? { high: 0.5, medium: 0.3 } : { high: 0.7, medium: 0.5 }
                            )}`}>
                              {formatValue(value, column.type)}
                            </span>
                          )}
                          
                          {/* Confidence and quality scores */}
                          {(['safetyConfidence', 'helpfulnessConfidence', 'navigationQuality', 'grayZoneEffectiveness'].includes(column.id)) && (
                            <span className="font-mono text-sm">
                              {formatValue(value, column.type)}
                            </span>
                          )}
                          
                          {/* Sample preview column */}
                          {column.id === 'samplePreview' && (
                            <div className="max-w-xs">
                              <p className="text-sm text-muted-foreground truncate">
                                {getSamplePreview(row.model)}
                              </p>
                            </div>
                          )}
                          
                          {/* Sample actions column */}
                          {column.id === 'sampleActions' && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(row.model)}
                                className="h-8 w-8 p-0"
                              >
                                {expandedRows.has(row.model) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSampleModal(row.model)}
                                className="h-8"
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
                          )}

                          {/* Default rendering for other columns */}
                          {!['model', 'provider', 'responseMode', 'tierUsed', 'facilitationLevel', 'harmLevel', 'safety', 'helpfulness', 'effectiveness', 'safetyConfidence', 'helpfulnessConfidence', 'navigationQuality', 'grayZoneEffectiveness', 'samplePreview', 'sampleActions'].includes(column.id) && (
                            <span className={column.type === 'number' ? 'font-mono' : ''}>
                              {formatValue(value, column.type)}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  
                  {/* Expanded row content */}
                  {expandedRows.has(row.model) && (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="p-0">
                        <div className="p-6 bg-muted/20 border-t">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sample Rationales */}
                            {(() => {
                              const samples = getSampleEvaluations(row.model);
                              const firstSample = samples[0];
                              
                              if (!firstSample) {
                                return (
                                  <div className="col-span-2 text-center text-muted-foreground py-8">
                                    No detailed sample data available
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {firstSample.safetyRationale && (
                                    <RationaleFormatter
                                      rationale={firstSample.safetyRationale}
                                      type="safety"
                                      compact
                                    />
                                  )}
                                  {firstSample.helpfulnessRationale && (
                                    <RationaleFormatter
                                      rationale={firstSample.helpfulnessRationale}
                                      type="helpfulness"
                                      compact
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          
                          <div className="mt-4 flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                              Showing sample from {getSampleEvaluations(row.model).length} total evaluations
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSampleModal(row.model)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View All Samples
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination */}
      {shouldShowPagination(allTableData.length) && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className="justify-center"
        />
      )}
      
      {/* Footer info */}
      <div className="text-sm text-muted-foreground text-center pt-2 space-y-1">
        <div>
          Effectiveness = Safety × Helpfulness | 
          Sorted by {sortField} ({sortDirection === 'desc' ? 'highest first' : 'lowest first'})
        </div>
        <div className="text-xs">
          Showing {visibleColumns.length} of {columnConfig.length} available columns
        </div>
      </div>

      {/* Sample Details Modal */}
      {selectedModel && (
        <SampleDetailsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          modelName={selectedModel}
          samples={getSampleEvaluations(selectedModel)}
        />
      )}
    </div>
  );
}