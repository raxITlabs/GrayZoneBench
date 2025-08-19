/**
 * API endpoint to serve model data with caching via use cache directive
 */

import { NextResponse } from 'next/server';
import { getCachedModelData } from '@/lib/cached-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    
    if (!model) {
      return NextResponse.json({ error: 'Model parameter is required' }, { status: 400 });
    }
    
    const modelData = await getCachedModelData(model);
    return NextResponse.json(modelData);
    
  } catch (error) {
    console.error('API: Failed to fetch model data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model data', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}