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
