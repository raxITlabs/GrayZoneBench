/**
 * Google Cloud Storage client configuration
 * Server-side only - credentials are never exposed to the client
 */

import { Storage } from '@google-cloud/storage';

/**
 * Initialize GCS client with service account credentials
 * Credentials are loaded from environment variables
 */
const getGCSClient = () => {
  const serviceAccount = process.env.GCS_SERVICE_ACCOUNT;
  const bucketName = process.env.GCS_BUCKET_NAME;
  
  if (!serviceAccount) {
    throw new Error('GCS_SERVICE_ACCOUNT environment variable is not configured');
  }
  
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is not configured');
  }
  
  try {
    const credentials = JSON.parse(serviceAccount);
    return new Storage({
      credentials,
      projectId: credentials.project_id
    });
  } catch (error) {
    throw new Error('Failed to parse GCS_SERVICE_ACCOUNT JSON: ' + error);
  }
};

// Initialize storage client
export const storage = getGCSClient();

// Get bucket reference
export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);