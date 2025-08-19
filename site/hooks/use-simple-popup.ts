'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'raxit-popup-next-show';

export function useSimplePopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextShowTime = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    // Check if we're still in backoff period
    if (nextShowTime && now < parseInt(nextShowTime)) {
      return; // Don't show yet
    }

    // Show after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const dismissPopup = useCallback(() => {
    setIsVisible(false);

    if (typeof window !== 'undefined') {
      // Get current backoff multiplier or start with 1
      const currentBackoff = localStorage.getItem(`${STORAGE_KEY}-backoff`);
      const backoffMultiplier = currentBackoff ? parseInt(currentBackoff) * 16 : 1; // 1h, 16h, 256h...
      
      // Set next show time
      const nextShow = Date.now() + (backoffMultiplier * 60 * 60 * 1000);
      localStorage.setItem(STORAGE_KEY, nextShow.toString());
      localStorage.setItem(`${STORAGE_KEY}-backoff`, backoffMultiplier.toString());
    }
  }, []);

  return {
    isVisible,
    dismissPopup
  };
}