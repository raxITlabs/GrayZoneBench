/**
 * Simple API endpoint to serve metadata without caching
 */

import { NextResponse } from 'next/server';
import { bucket } from '@/lib/gcs-client';

export async function GET() {
  try {
    console.log('API: Fetching metadata from GCS...');
    
    const file = bucket.file('latest/metadata.json');
    const [contents] = await file.download();
    const metadata = JSON.parse(contents.toString());
    
    console.log(`API: Successfully fetched metadata: ${metadata.models_tested.length} models, ${metadata.total_prompts} prompts`);
    
    return NextResponse.json(metadata);
    
  } catch (error) {
    console.error('API: Failed to fetch metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}