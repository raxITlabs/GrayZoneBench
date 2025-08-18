/**
 * TableView Component - Detailed model results table
 */

'use client';

import React, { useMemo, useState } from 'react';
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
import { Search, Download, ArrowUpDown } from 'lucide-react';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import { prepareTableData } from '@/libs/data-transforms';
import type { BenchmarkTableRow } from '@/libs/data-transforms';
import { getResponseModeBadgeProps } from '@/lib/utils';

interface TableViewProps {
  metadata: BenchmarkMetadata | null;
  modelData: Record<string, ModelData>;
  selectedProviders: string[];
}

type SortField = keyof BenchmarkTableRow;
type SortDirection = 'asc' | 'desc';

export function TableView({
  metadata,
  modelData,
  selectedProviders
}: TableViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('effectiveness');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Prepare and filter data
  const tableData = useMemo(() => {
    if (!metadata || Object.keys(modelData).length === 0) return [];
    
    let data = prepareTableData(modelData, selectedProviders);
    
    // Apply search filter
    if (searchTerm) {
      data = data.filter(row => 
        row.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.responseMode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    data.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
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

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new field
    }
  };

  const handleExport = () => {
    const csvContent = [
      // Header
      ['Model', 'Provider', 'Safety Score', 'Helpfulness Score', 'Effectiveness', 'Response Mode', 'Total Tokens', 'Evaluations'].join(','),
      // Data rows
      ...tableData.map(row => [
        row.model,
        row.provider,
        row.safety.toFixed(3),
        row.helpfulness.toFixed(3),
        row.effectiveness.toFixed(3),
        row.responseMode,
        row.tokens.toString(),
        row.evaluations.toString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grayzonebench-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;
  const formatTokens = (tokens: number) => tokens.toLocaleString();
  
  // Format response mode to proper title case
  const formatResponseMode = (mode: string) => {
    return mode
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get score color and style classes using CSS variables for optimal readability in both light/dark modes
  const getScoreColorClass = (score: number, thresholds: { high: number; medium: number }) => {
    if (score >= thresholds.high) return 'text-chart-1 font-semibold'; // Good performance - uses existing chart-1 color
    if (score >= thresholds.medium) return 'text-foreground font-medium'; // Warning/moderate - use primary text color for readability
    return 'text-destructive font-semibold'; // Poor performance - uses existing destructive color
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </div>
    </TableHead>
  );

  if (tableData.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No data available for selected filters</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models, providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {tableData.length} results
          </span>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="model">Model</SortableHeader>
              <SortableHeader field="provider">Provider</SortableHeader>
              <SortableHeader field="safety">Safety</SortableHeader>
              <SortableHeader field="helpfulness">Helpfulness</SortableHeader>
              <SortableHeader field="effectiveness">Effectiveness</SortableHeader>
              <SortableHeader field="responseMode">Response Mode</SortableHeader>
              <SortableHeader field="tokens">Tokens</SortableHeader>
              <SortableHeader field="evaluations">Evaluations</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.model} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {row.model}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={row.provider} size={20} />
                    <span className="text-sm font-medium">{row.provider}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  <span className={getScoreColorClass(row.safety, { high: 0.7, medium: 0.5 })}>
                    {formatScore(row.safety)}
                  </span>
                </TableCell>
                <TableCell className="font-mono">
                  <span className={getScoreColorClass(row.helpfulness, { high: 0.7, medium: 0.5 })}>
                    {formatScore(row.helpfulness)}
                  </span>
                </TableCell>
                <TableCell className="font-mono">
                  <span className={`${getScoreColorClass(row.effectiveness, { high: 0.5, medium: 0.3 })} font-bold`}>
                    {formatScore(row.effectiveness)}
                  </span>
                </TableCell>
                <TableCell>
                  {(() => {
                    const badgeProps = getResponseModeBadgeProps(row.responseMode);
                    return (
                      <Badge variant={badgeProps.variant} className={`text-sm ${badgeProps.className}`}>
                        {badgeProps.formattedMode}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatTokens(row.tokens)}
                </TableCell>
                <TableCell className="text-center">
                  {row.evaluations}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Footer info */}
      <div className="text-sm text-muted-foreground text-center pt-2">
        Effectiveness = Safety × Helpfulness | 
        Sorted by {sortField} ({sortDirection === 'desc' ? 'highest first' : 'lowest first'})
      </div>
    </div>
  );
}