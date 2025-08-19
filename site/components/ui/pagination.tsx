/**
 * Pagination Component - Reusable pagination controls
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface PaginationInfo {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
  className
}: PaginationProps) {
  const { pageIndex, pageSize, pageCount, totalItems, hasNextPage, hasPreviousPage } = pagination;

  // Generate page numbers to show
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(0, pageIndex - delta); i <= Math.min(pageCount - 1, pageIndex + delta); i++) {
      range.push(i);
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        rangeWithDots.push(0, -1); // -1 represents dots
      } else {
        rangeWithDots.push(0);
      }
    }

    rangeWithDots.push(...range);

    if (range[range.length - 1] < pageCount - 1) {
      if (range[range.length - 1] < pageCount - 2) {
        rangeWithDots.push(-1, pageCount - 1); // -1 represents dots
      } else {
        rangeWithDots.push(pageCount - 1);
      }
    }

    return rangeWithDots;
  };

  // Show pagination if there are multiple pages OR if we have a page size selector
  // This ensures users can always change page size even when all data fits on one page
  const shouldShowPaginationControls = pageCount > 1;
  const shouldShowPageSizeOnly = pageCount <= 1 && showPageSizeSelector && onPageSizeChange && totalItems > 0;

  const visiblePages = getVisiblePages();
  const startItem = pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalItems);

  // Don't show anything if no data
  if (totalItems === 0) {
    return null;
  }

  // If only showing page size selector (single page but want to allow changing page size)
  if (shouldShowPageSizeOnly) {
    return (
      <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
        {/* Page info */}
        {showPageInfo && (
          <div className="text-sm text-muted-foreground">
            Showing all {totalItems.toLocaleString()} results
          </div>
        )}

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange!(Number(e.target.value))}
            className="h-8 px-2 text-sm border border-input bg-background rounded-md"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Don't show full pagination if only one page and no page size selector
  if (!shouldShowPaginationControls) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
      {/* Page info */}
      {showPageInfo && (
        <div className="text-sm text-muted-foreground">
          Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalItems.toLocaleString()} results
        </div>
      )}

      {/* Page size selector */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 text-sm border border-input bg-background rounded-md"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={!hasPreviousPage}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={!hasPreviousPage}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === -1) {
              return (
                <div key={`dots-${index}`} className="h-8 w-8 flex items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              );
            }

            return (
              <Button
                key={page}
                variant={page === pageIndex ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="h-8 w-8 p-0"
              >
                {page + 1}
              </Button>
            );
          })}
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageCount - 1)}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook for pagination state management
 */
export function usePagination(
  data: any[],
  initialPageSize: number = 10
): {
  paginatedData: any[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  paginationState: PaginationState;
} {
  const [paginationState, setPaginationState] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize
  });

  const { pageIndex, pageSize } = paginationState;

  // Calculate pagination info
  const pageCount = Math.ceil(data.length / pageSize);
  const hasNextPage = pageIndex < pageCount - 1;
  const hasPreviousPage = pageIndex > 0;

  // Get paginated data
  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  const pagination: PaginationInfo = {
    pageIndex,
    pageSize,
    pageCount,
    totalItems: data.length,
    hasNextPage,
    hasPreviousPage
  };

  const onPageChange = React.useCallback((page: number) => {
    setPaginationState(prev => ({
      ...prev,
      pageIndex: Math.max(0, Math.min(page, pageCount - 1))
    }));
  }, [pageCount]);

  const onPageSizeChange = React.useCallback((size: number) => {
    setPaginationState(prev => ({
      pageIndex: 0, // Reset to first page when changing page size
      pageSize: size
    }));
  }, []);

  return {
    paginatedData,
    pagination,
    onPageChange,
    onPageSizeChange,
    paginationState
  };
}

/**
 * Simple utility to check if pagination should be shown
 * Now returns true for any data so users can always adjust page size
 */
export function shouldShowPagination(totalItems: number, threshold: number = 10): boolean {
  return totalItems > 0; // Show pagination controls whenever we have data
}
