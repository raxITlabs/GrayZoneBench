/**
 * API endpoint to serve metadata with caching via use cache directive
 */

import { NextResponse } from 'next/server';
import { getCachedMetadata } from '@/lib/cached-data';

export async function GET() {
  try {
    const metadata = await getCachedMetadata();
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('API: Failed to fetch metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}