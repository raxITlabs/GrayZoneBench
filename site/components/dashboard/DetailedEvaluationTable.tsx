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
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModelData, BenchmarkMetadata } from '@/types/evaluation';
import type { DetailedEvaluationTableRow, ColumnGroup } from '@/types/comprehensive-evaluation';
import { 
  prepareDetailedTableData, 
  getColumnGroups, 
  getTableColumnConfig 
} from '@/libs/comprehensive-data-transforms';
import { getResponseModeBadgeProps } from '@/lib/utils';

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
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({
    core: true,
    confidence: true,
    tiers: true,
    response: false,
    harm: false,
    technical: false
  });

  // Get column configuration
  const columnGroups = useMemo(() => getColumnGroups(), []);
  const columnConfig = useMemo(() => getTableColumnConfig(), []);

  // Prepare and filter data
  const tableData = useMemo(() => {
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

  const handleExport = () => {
    const headers = visibleColumns.map(col => col.label);
    const csvContent = [
      headers.join(','),
      ...tableData.map(row => 
        visibleColumns.map(col => {
          const value = row[col.id];
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          if (typeof value === 'number') {
            if (col.type === 'percentage') return (value * 100).toFixed(1) + '%';
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

  // Formatting functions
  const formatValue = (value: any, type: string) => {
    switch (type) {
      case 'percentage':
        return `${((value as number) * 100).toFixed(1)}%`;
      case 'number':
        return (value as number).toLocaleString();
      case 'boolean':
        return value ? <CheckCircle className="w-4 h-4 text-chart-1" /> : <XCircle className="w-4 h-4 text-muted-foreground" />;
      case 'date':
        return new Date(value as string).toLocaleDateString();
      default:
        return value?.toString() || '';
    }
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
          {tableData.length} models • {visibleColumns.length} columns
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

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
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
                <TableRow key={row.model} className="hover:bg-muted/50">
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
                        
                        {/* Default rendering for other columns */}
                        {!['model', 'provider', 'responseMode', 'tierUsed', 'facilitationLevel', 'harmLevel', 'safety', 'helpfulness', 'effectiveness', 'safetyConfidence', 'helpfulnessConfidence', 'navigationQuality', 'grayZoneEffectiveness'].includes(column.id) && (
                          <span className={column.type === 'number' ? 'font-mono' : ''}>
                            {formatValue(value, column.type)}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
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
    </div>
  );
}