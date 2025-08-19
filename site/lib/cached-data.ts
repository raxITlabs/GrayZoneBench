import { bucket } from '@/lib/gcs-client';

export async function getCachedMetadata() {
  'use cache';
  
  console.log('Fetching metadata from GCS (cached)...');
  
  const file = bucket.file('latest/metadata.json');
  const [contents] = await file.download();
  const metadata = JSON.parse(contents.toString());
  
  console.log(`Cached metadata: ${metadata.models_tested.length} models, ${metadata.total_prompts} prompts`);
  
  return metadata;
}

export async function getCachedModelData(model: string) {
  'use cache';
  
  console.log(`Fetching model data for: ${model} (cached)`);
  
  const file = bucket.file(`latest/models/${model}.json`);
  const [contents] = await file.download();
  const modelData = JSON.parse(contents.toString());
  
  const resultsCount = Object.keys(modelData.results).length;
  console.log(`Cached ${model}: ${resultsCount} results`);
  
  return modelData;
}