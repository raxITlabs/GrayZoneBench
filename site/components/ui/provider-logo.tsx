/**
 * ProviderLogo Component - Displays provider logos with proper theming
 */
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ProviderLogoProps {
  provider: string;
  className?: string;
  size?: number;
}

// Provider logo mapping
const PROVIDER_LOGOS: Record<string, { light: string; dark?: string; alt: string }> = {
  'Anthropic': {
    light: '/providers/anthropic_small.svg',
    alt: 'Anthropic'
  },
  'OpenAI': {
    light: '/providers/openai_small.svg',
    alt: 'OpenAI'
  },
  'Google': {
    light: '/providers/google_small.svg',
    alt: 'Google'
  },
  'AWS': {
    light: '/providers/aws_small.svg',
    dark: '/providers/aws_small_dark.svg',
    alt: 'AWS'
  },
  'Meta': {
    light: '/providers/meta_small.svg',
    alt: 'Meta'
  },
  'Microsoft': {
    light: '/providers/ms_small.png',
    alt: 'Microsoft'
  },
  'Cohere': {
    light: '/providers/cohere_small.png',
    alt: 'Cohere'
  },
  'Mistral': {
    light: '/providers/mistral_small.png',
    alt: 'Mistral'
  },
  'DeepSeek': {
    light: '/providers/deepseek_small.jpg',
    alt: 'DeepSeek'
  },
  'xAI': {
    light: '/providers/xai_small.svg',
    alt: 'xAI'
  },
  'Databricks': {
    light: '/providers/databricks_small.png',
    alt: 'Databricks'
  },
  'Alibaba': {
    light: '/providers/alibaba_small.svg',
    alt: 'Alibaba'
  }
};

// Fallback for unknown providers
const FALLBACK_LOGO = {
  light: '/providers/ai.svg',
  alt: 'AI Provider'
};

export function ProviderLogo({ 
  provider, 
  className = '', 
  size = 20 
}: ProviderLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  if (typeof window !== 'undefined') {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches ||
                     document.documentElement.classList.contains('dark');
    if (darkMode !== isDarkMode) {
      setIsDarkMode(darkMode);
    }
  }

  const logoConfig = PROVIDER_LOGOS[provider] || FALLBACK_LOGO;
  const logoSrc = imageError 
    ? FALLBACK_LOGO.light 
    : (isDarkMode && logoConfig.dark) 
      ? logoConfig.dark 
      : logoConfig.light;

  const altText = imageError ? FALLBACK_LOGO.alt : logoConfig.alt;

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      title={provider}
    >
      <Image
        src={logoSrc}
        alt={altText}
        width={size}
        height={size}
        className="object-contain"
        onError={() => setImageError(true)}
        unoptimized // For SVG files
      />
    </div>
  );
}