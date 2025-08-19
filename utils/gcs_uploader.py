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
    Upload benchmark results to Google Cloud Storage with model-specific files.
    
    Creates separate files for each model to solve the 1MB limit issue:
    - latest/metadata.json (~5KB) - Basic info and model stats
    - latest/models/{model}.json (~200KB each) - Complete results per model
    
    Args:
        local_root: Root directory containing model output folders (not used anymore)
        results_file: Path to the aggregated results JSON file (not used anymore)
        results_data: The results data list from the benchmark
        progress_callback: Optional callback function for progress updates
        
    Returns:
        Dictionary with upload status and details
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
        
        # Group results by model
        if progress_callback:
            progress_callback(f"Organizing {len(results_data)} results by model...")
        
        models_data = {}
        models_updated = set()
        
        for result in results_data:
            model = result["model"]
            models_updated.add(model)
            
            if model not in models_data:
                models_data[model] = {}
            
            # Store result by prompt ID with timestamp
            prompt_id = str(result["hf_index"])
            result_with_timestamp = result.copy()
            result_with_timestamp["timestamp"] = datetime.now(timezone.utc).isoformat()
            models_data[model][prompt_id] = result_with_timestamp
        
        # Download existing model data and merge
        if progress_callback:
            progress_callback("Downloading existing model data for merge...")
        
        for model in models_updated:
            try:
                existing_blob = bucket.blob(f"latest/models/{model}.json")
                if existing_blob.exists():
                    existing_json = existing_blob.download_as_text()
                    existing_model_data = json.loads(existing_json)
                    existing_results = existing_model_data.get("results", {})
                    
                    # Merge existing with new results
                    existing_results.update(models_data[model])
                    models_data[model] = existing_results
                    logger.debug(f"Merged existing data for model {model}")
            except Exception as e:
                logger.debug(f"No existing data for model {model}: {e}")
        
        # Calculate statistics for each model
        all_models_info = {}
        upload_count = 0
        
        # Upload individual model files
        if progress_callback:
            progress_callback("Uploading model-specific files...")
        
        for model, results in models_data.items():
            # Calculate model statistics
            model_results = list(results.values())
            safety_scores = [r.get("detailed_safety_score", 0) for r in model_results if r.get("detailed_safety_score") is not None]
            helpfulness_scores = [r.get("detailed_helpfulness_score", 0) for r in model_results if r.get("detailed_helpfulness_score") is not None]
            safe_count = len([r for r in model_results if r.get("safety") == "SAFE"])
            unsafe_count = len([r for r in model_results if r.get("safety") == "UNSAFE"])
            total_tokens = sum([r.get("input_tokens", 0) + r.get("output_tokens", 0) for r in model_results])
            
            model_stats = {
                "total_prompts": len(model_results),
                "avg_safety": sum(safety_scores) / len(safety_scores) if safety_scores else 0,
                "avg_helpfulness": sum(helpfulness_scores) / len(helpfulness_scores) if helpfulness_scores else 0,
                "safe_count": safe_count,
                "unsafe_count": unsafe_count,
                "total_tokens": total_tokens,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
            # Create model file structure
            # Extract provider from first result if available
            provider = None
            if model_results and len(model_results) > 0:
                provider = model_results[0].get("provider")
            
            model_file_data = {
                "model": model,
                "provider": provider,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "stats": model_stats,
                "results": results
            }
            
            # Upload model file
            model_json = json.dumps(model_file_data, indent=2, ensure_ascii=False, cls=ScoreBreakdownEncoder)
            model_blob = bucket.blob(f"latest/models/{model}.json")
            model_blob.upload_from_string(
                model_json,
                content_type='application/json'
            )
            
            # Estimate file size for metadata
            file_size_kb = len(model_json.encode('utf-8')) / 1024
            all_models_info[model] = {
                **model_stats,
                "provider": provider,
                "file_size_kb": round(file_size_kb, 1)
            }
            
            upload_count += 1
            logger.info(f"Uploaded model data for {model} ({file_size_kb:.1f}KB)")
        
        # Download existing metadata to merge with current run data
        if progress_callback:
            progress_callback("Downloading existing metadata for merge...")
        
        existing_metadata = {}
        try:
            metadata_blob = bucket.blob("latest/metadata.json")
            if metadata_blob.exists():
                existing_metadata = json.loads(metadata_blob.download_as_text())
                logger.debug("Downloaded existing metadata for merge")
        except Exception as e:
            logger.debug(f"No existing metadata to merge: {e}")
        
        # Merge existing models_info with new models_info
        # New models override existing ones (to get latest stats)
        existing_models_info = existing_metadata.get("models_info", {})
        existing_models_info.update(all_models_info)
        
        # Accumulate all models tested (existing + new)
        all_models_tested = set(existing_metadata.get("models_tested", []))
        all_models_tested.update(models_updated)
        
        # Create lightweight metadata file
        if progress_callback:
            progress_callback("Creating accumulated metadata file...")
        
        total_prompts = max([len(results) for results in models_data.values()]) if models_data else 0
        
        metadata = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "models_tested": sorted(list(all_models_tested)),  # ALL models ever tested
            "total_prompts": total_prompts,
            "last_run_models": sorted(list(models_updated)),  # Current run models only
            "models_info": existing_models_info  # Accumulated model info
        }
        
        # Upload metadata
        metadata_json = json.dumps(metadata, indent=2, ensure_ascii=False, cls=ScoreBreakdownEncoder)
        metadata_blob = bucket.blob("latest/metadata.json")
        metadata_blob.upload_from_string(
            metadata_json,
            content_type='application/json'
        )
        upload_count += 1
        
        metadata_size_kb = len(metadata_json.encode('utf-8')) / 1024
        logger.info(f"Uploaded metadata ({metadata_size_kb:.1f}KB)")
        
        # Save timestamped backup
        timestamp = datetime.now(timezone.utc).isoformat(timespec='seconds').replace(':', '-')
        backup_blob = bucket.blob(f"runs/{timestamp}/metadata.json")
        backup_blob.upload_from_string(metadata_json, content_type='application/json')
        
        # Update index
        update_index(bucket, timestamp, results_data)
        
        console_url = f"https://console.cloud.google.com/storage/browser/{bucket_name}/latest"
        print(f"\n✓ Uploaded model-specific files to GCS bucket: {bucket_name}")
        print(f"  Models updated this run: {', '.join(sorted(models_updated))}")
        print(f"  Total models tracked: {len(all_models_tested)} ({', '.join(sorted(all_models_tested))})")
        print(f"  Files uploaded: {upload_count} ({metadata_size_kb:.1f}KB metadata + {len(models_updated)} model files)")
        print(f"  View at: {console_url}")
        
        return {
            'success': True,
            'configured': True,
            'files_uploaded': upload_count,
            'bucket_name': bucket_name,
            'base_path': 'latest',
            'console_url': console_url,
            'models_updated': list(models_updated),
            'total_models_tracked': len(all_models_tested),
            'all_models_tracked': sorted(list(all_models_tested)),
            'total_prompts': total_prompts,
            'metadata_size_kb': metadata_size_kb
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