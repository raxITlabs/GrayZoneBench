import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get badge styling properties for response modes using global CSS colors
 * Highlights constructive-refusal as ideal behavior while maintaining readability
 */
export function getResponseModeBadgeProps(mode: string) {
  const formattedMode = mode.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  switch (mode) {
    case 'constructive-refusal':
      return {
        variant: 'default' as const,
        className: 'bg-chart-1 text-primary-foreground border-chart-1 font-medium',
        formattedMode
      };
    case 'safe-completion':
      return {
        variant: 'secondary' as const,
        className: 'bg-chart-2 text-foreground border-chart-2',
        formattedMode
      };
    case 'direct-answer':
      return {
        variant: 'outline' as const,
        className: 'bg-destructive/10 text-destructive border-destructive/20 font-medium',
        formattedMode
      };
    default:
      return {
        variant: 'outline' as const,
        className: 'border-muted-foreground/40 text-foreground bg-muted/30',
        formattedMode
      };
  }
}

/**
 * Get consistent score color classes based on design system
 * Uses chart-1 (good), foreground (medium), destructive (poor)
 */
export function getScoreColorClass(score: number, thresholds: { high: number; medium: number }) {
  if (score >= thresholds.high) return 'text-chart-1 font-semibold';
  if (score >= thresholds.medium) return 'text-foreground font-medium';
  return 'text-destructive font-semibold';
}

/**
 * Get effectiveness level color class with design system consistency
 */
export function getEffectivenessColorClass(effectiveness: string) {
  switch (effectiveness.toLowerCase()) {
    case 'excellent':
    case 'good':
      return 'text-chart-1 font-semibold';
    case 'fair':
      return 'text-foreground font-medium';
    case 'poor':
    default:
      return 'text-destructive font-semibold';
  }
}

/**
 * Get harm/facilitation level badge properties using design system
 */
export function getHarmLevelBadgeProps(level: string) {
  switch (level.toLowerCase()) {
    case 'negligible':
      return { variant: 'secondary' as const, className: '' };
    case 'low':
      return { variant: 'outline' as const, className: 'border-chart-2 text-foreground' };
    case 'moderate':
      return { variant: 'default' as const, className: 'bg-foreground text-background' };
    case 'high':
    case 'severe':
      return { variant: 'destructive' as const, className: '' };
    default:
      return { variant: 'outline' as const, className: '' };
  }
}

/**
 * Get tier badge properties using design system
 */
export function getTierBadgeProps(tier: string) {
  switch (tier.toLowerCase()) {
    case 'deterministic':
      return { variant: 'outline' as const, className: 'border-chart-2 text-foreground' };
    case 'moderation':
      return { variant: 'secondary' as const, className: '' };
    case 'agent':
      return { variant: 'default' as const, className: 'bg-chart-1 text-primary-foreground' };
    default:
      return { variant: 'outline' as const, className: '' };
  }
}

/**
 * Format percentage scores consistently
 */
export function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Format large numbers consistently
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
