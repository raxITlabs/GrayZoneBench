/**
 * Simple API endpoint to serve model data without caching
 */

import { NextResponse } from 'next/server';
import { bucket } from '@/lib/gcs-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    
    if (!model) {
      return NextResponse.json({ error: 'Model parameter is required' }, { status: 400 });
    }
    
    console.log(`API: Fetching model data for: ${model}`);
    
    const file = bucket.file(`latest/models/${model}.json`);
    const [contents] = await file.download();
    const modelData = JSON.parse(contents.toString());
    
    const resultsCount = Object.keys(modelData.results).length;
    console.log(`API: Successfully fetched ${model}: ${resultsCount} results`);
    
    return NextResponse.json(modelData);
    
  } catch (error) {
    console.error('API: Failed to fetch model data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model data', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}