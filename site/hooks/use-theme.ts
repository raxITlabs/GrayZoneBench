'use client';

import { useTheme as useNextTheme } from 'next-themes';

/**
 * Hook to track theme changes for reactive color updates
 * Returns the current theme and resolved theme
 */
export function useTheme() {
  const { theme, resolvedTheme } = useNextTheme();
  
  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark'
  };
}
