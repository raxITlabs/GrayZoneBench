"""
Google Cloud Storage uploader for GrayZoneBench results.

Automatically uploads benchmark results to GCS when configured via environment variables.
Silent operation - no errors if not configured.
"""

import json
import logging
import os
from dataclasses import asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class ScoreBreakdownEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle ScoreBreakdown, Enum, and other dataclass objects."""
    def default(self, obj):
        # Handle Enum objects (SafetyLevel, HelpfulnessLevel, etc.)
        if isinstance(obj, Enum):
            return obj.value
        # Handle dataclass objects
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        # Let the base class handle other types
        return super().default(obj)


def upload_results(
    local_root: Path,
    results_file: Path,
    results_data: Dict[str, Any],
    progress_callback=None
) -> Dict[str, Any]:
    """
    Upload benchmark results to Google Cloud Storage.
    
    Automatically uploads if GCS_SERVICE_ACCOUNT and GCS_BUCKET_NAME are configured.
    Otherwise, returns silently without error.
    
    Args:
        local_root: Root directory containing model output folders
        results_file: Path to the aggregated results JSON file  
        results_data: The results data dictionary
        progress_callback: Optional callback function for progress updates
        
    Returns:
        Dictionary with upload status and details:
        - success: bool indicating if upload succeeded
        - configured: bool indicating if GCS is configured
        - files_uploaded: number of files uploaded
        - bucket_name: name of the GCS bucket
        - base_path: path in GCS where files were uploaded
        - console_url: URL to view in GCS console
        - error: error message if failed
    """
    # Check if GCS is configured
    service_account_env = os.getenv("GCS_SERVICE_ACCOUNT")
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    
    if not service_account_env or not bucket_name:
        logger.debug("GCS upload not configured (missing GCS_SERVICE_ACCOUNT or GCS_BUCKET_NAME)")
        return {
            'success': False,
            'configured': False,
            'error': 'GCS not configured'
        }
    
    try:
        # Import here to avoid dependency if not using GCS
        from google.cloud import storage
        from google.oauth2 import service_account
        
        # Parse service account JSON from environment variable
        try:
            service_account_info = json.loads(service_account_env)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GCS_SERVICE_ACCOUNT JSON: {e}")
            return {
                'success': False,
                'configured': True,
                'error': f'Failed to parse service account JSON: {e}'
            }
        
        # Initialize GCS client with credentials
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )
        client = storage.Client(credentials=credentials, project=service_account_info.get('project_id'))
        bucket = client.bucket(bucket_name)
        
        # Generate timestamp-based path
        timestamp = datetime.now(timezone.utc).isoformat(timespec='seconds').replace(':', '-')
        base_path = f"runs/{timestamp}"
        
        # Upload main results file
        if progress_callback:
            progress_callback(f"Uploading results.json...")
        results_blob = bucket.blob(f"{base_path}/results.json")
        results_json = json.dumps(results_data, indent=2, ensure_ascii=False, cls=ScoreBreakdownEncoder)
        results_blob.upload_from_string(
            results_json,
            content_type='application/json'
        )
        logger.info(f"Uploaded results to gs://{bucket_name}/{base_path}/results.json")
        
        # Upload individual model output files
        upload_count = 1  # Already uploaded results.json
        for model_dir in local_root.iterdir():
            if model_dir.is_dir() and not model_dir.name.startswith('.'):
                model_name = model_dir.name
                if progress_callback:
                    progress_callback(f"Uploading {model_name} files...")
                
                # Upload all JSON files in model directory
                for json_file in model_dir.glob("*.json"):
                    blob_path = f"{base_path}/models/{model_name}/{json_file.name}"
                    blob = bucket.blob(blob_path)
                    blob.upload_from_filename(
                        str(json_file),
                        content_type='application/json'
                    )
                    upload_count += 1
                    logger.debug(f"Uploaded {json_file.name} to {blob_path}")
                
                # Upload markdown files if they exist
                for md_file in model_dir.glob("*.md"):
                    blob_path = f"{base_path}/models/{model_name}/{md_file.name}"
                    blob = bucket.blob(blob_path)
                    blob.upload_from_filename(
                        str(md_file),
                        content_type='text/markdown'
                    )
                    upload_count += 1
                    logger.debug(f"Uploaded {md_file.name} to {blob_path}")
        
        # Update "latest" pointer for easy access
        if progress_callback:
            progress_callback(f"Finalizing upload...")
        latest_blob = bucket.blob("latest/results.json")
        latest_blob.upload_from_string(
            results_json,  # Already encoded with ScoreBreakdownEncoder above
            content_type='application/json'
        )
        logger.info(f"Updated latest results at gs://{bucket_name}/latest/results.json")
        
        # Create or update index file
        update_index(bucket, timestamp, results_data)
        
        console_url = f"https://console.cloud.google.com/storage/browser/{bucket_name}/{base_path}"
        print(f"\n✓ Uploaded {upload_count} files to GCS bucket: {bucket_name}")
        print(f"  View at: {console_url}")
        
        return {
            'success': True,
            'configured': True,
            'files_uploaded': upload_count,
            'bucket_name': bucket_name,
            'base_path': base_path,
            'console_url': console_url
        }
        
    except ImportError:
        logger.error("google-cloud-storage not installed. Run: uv add google-cloud-storage")
        return {
            'success': False,
            'configured': True,
            'error': 'google-cloud-storage not installed'
        }
    except Exception as e:
        logger.error(f"GCS upload failed: {e}")
        return {
            'success': False,
            'configured': True,
            'error': str(e)
        }


def update_index(bucket, timestamp: str, results_data: Dict[str, Any]) -> None:
    """
    Update the index.json file with information about this run.
    
    Args:
        bucket: GCS bucket object
        timestamp: ISO timestamp of this run
        results_data: Results data containing model information
    """
    try:
        # Try to fetch existing index
        index_blob = bucket.blob("index.json")
        if index_blob.exists():
            index_data = json.loads(index_blob.download_as_text())
        else:
            index_data = {"runs": []}
        
        # Extract summary information
        models = list({r.get("model") for r in results_data if isinstance(r, dict) and "model" in r})
        num_prompts = len(results_data) if isinstance(results_data, list) else 0
        
        # Add new run info
        run_info = {
            "timestamp": timestamp,
            "path": f"runs/{timestamp}/",
            "models": models,
            "num_prompts": num_prompts,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Prepend to list (newest first)
        index_data["runs"].insert(0, run_info)
        
        # Keep only last 100 runs in index
        index_data["runs"] = index_data["runs"][:100]
        
        # Upload updated index
        index_blob.upload_from_string(
            json.dumps(index_data, indent=2, cls=ScoreBreakdownEncoder),
            content_type='application/json'
        )
        logger.debug("Updated index.json")
        
    except Exception as e:
        logger.warning(f"Failed to update index.json: {e}")
        # Not critical, continue anyway


def download_results(bucket_name: str, run_path: str, output_dir: Path) -> bool:
    """
    Download results from GCS (utility function for future use).
    
    Args:
        bucket_name: Name of the GCS bucket
        run_path: Path in bucket (e.g., "runs/2025-01-14T10-30-00/")
        output_dir: Local directory to save files
        
    Returns:
        True if download successful, False otherwise
    """
    service_account_env = os.getenv("GCS_SERVICE_ACCOUNT")
    if not service_account_env:
        logger.error("GCS_SERVICE_ACCOUNT not configured")
        return False
    
    try:
        from google.cloud import storage
        from google.oauth2 import service_account
        
        service_account_info = json.loads(service_account_env)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )
        client = storage.Client(credentials=credentials)
        bucket = client.bucket(bucket_name)
        
        # List and download all blobs with the prefix
        blobs = bucket.list_blobs(prefix=run_path)
        download_count = 0
        
        for blob in blobs:
            # Create local path structure
            relative_path = blob.name[len(run_path):]
            local_path = output_dir / relative_path
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Download file
            blob.download_to_filename(str(local_path))
            download_count += 1
            logger.debug(f"Downloaded {blob.name} to {local_path}")
        
        logger.info(f"Downloaded {download_count} files from GCS")
        return True
        
    except Exception as e:
        logger.error(f"GCS download failed: {e}")
        return False