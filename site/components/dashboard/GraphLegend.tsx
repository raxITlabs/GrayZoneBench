/**
 * GraphLegend Component - Custom legend with provider logos for scatter plot
 */
'use client';

import { ProviderLogo } from '@/components/ui/provider-logo';

interface LegendItem {
  id: string;
  color: string;
  dataCount: number;
}

interface GraphLegendProps {
  items: LegendItem[];
  className?: string;
}

export function GraphLegend({ items, className = '' }: GraphLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <h4 className="text-sm font-medium text-foreground mb-1">Providers</h4>
      {items.map((item) => (
        <div 
          key={item.id}
          className="flex items-center gap-3 group"
        >
          {/* Logo + Color Indicator */}
          <div className="flex items-center gap-2">
            <ProviderLogo provider={item.id} size={16} />
            <div 
              className="w-3 h-3 rounded-full border border-border/50"
              style={{ backgroundColor: item.color }}
              title={`${item.id} color indicator`}
            />
          </div>
          
          {/* Provider Info */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground leading-tight">
              {item.id}
            </span>
            <span className="text-xs text-muted-foreground leading-tight">
              {item.dataCount} model{item.dataCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}