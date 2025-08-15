#!/usr/bin/env python3
"""
GrayZoneBench - AI Safety Evaluation Tool

Enhanced safe-completion benchmark with multi-model comparison and gray zone navigation assessment.

- Loads prompts from HuggingFace datasets (default: raxITLabs/GrayZone)
- Lets you pick how many prompts: 1, N, or ALL; batching via --start-index
- Compares **multiple models** in one run (comma, space, or repeated flags)
- Three-tier evaluation system: deterministic, moderation API, agent-based LLM judgment
- Focuses on gray zone navigation between helpful and harmful responses

Examples
--------
# Smoke test: single prompt, multiple models
uv run python gray-zone-bench.py \
  --models gpt-5-mini o4-mini o3-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone --hf-config standard \
  --num-prompts 1

# Contextual evaluation with dual-use scenarios
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone --hf-config contextual \
  --context-column context --num-prompts 10

# Full evaluation with category filtering
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone --hf-config contextual \
  --context-column context --category-filter cybercrime_intrusion \
  --start-index 0 --num-prompts 25

"""
import argparse
import json
import os
import random
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Custom JSON encoder to handle ScoreBreakdown objects
class ScoreBreakdownEncoder(json.JSONEncoder):
    def default(self, obj):
        # Handle ScoreBreakdown and other dataclass objects
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        # Handle enum objects
        if hasattr(obj, 'value'):
            return obj.value
        return super().default(obj)

def format_score(value, default='N/A'):
    """Format a score value with 3 decimal places, handling non-numeric values."""
    if isinstance(value, (int, float)):
        return f"{value:.3f}"
    return str(value if value is not None else default)

# 3rd party (install via uv/pip): openai, datasets, rich
from datasets import load_dataset
# OpenAI import removed - now using unified LLM client

# Rich for beautiful CLI output
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.panel import Panel
from rich import box
from rich.live import Live

# Import utilities
from utils import (
    create_results_table, show_config_panel, show_completion_panel,
    judge_answer,
    DEFAULT_JUDGE_SYSTEM, DEFAULT_SAFETY_GRADER_SYSTEM, DEFAULT_HELPFULNESS_GRADER_SYSTEM,
    PromptRow, normalize_models_arg, build_prompt_text,
    ensure_dir, now_iso
)
# Import enhanced three-tier judge functions
from utils.judge import grade_safety, grade_helpfulness
from utils.llm_client import call_llm_response
from utils.cli_display import console
from utils.display import ProfessionalBenchmarkDisplay


# -------------------------------
# Logging
# -------------------------------
logger = logging.getLogger(__name__)




# -------------------------------
# Main
# -------------------------------
def main():
    ap = argparse.ArgumentParser(description="GrayZoneBench: AI safety evaluation with gray zone navigation assessment (multi-model)." )
    ap.add_argument("--models", nargs="+", required=True,
                    help="Space- or comma-separated list of model names (e.g., 'gpt-5-mini o4-mini' or 'gpt-5-mini,o4-mini').")
    ap.add_argument("--judge-model", required=True, help="Model to use as the judge (e.g., gpt-5-mini)." )
    ap.add_argument("--judge-task", default="both", choices=["safety", "helpfulness", "both"],
                    help="What to grade with the judge model: safety, helpfulness, or both.")
    ap.add_argument("--hf-dataset", default="raxITLabs/GrayZone", help="HF dataset name." )
    ap.add_argument("--hf-config", default="standard", help="HF config/subset (e.g., standard, contextual, copyright)." )
    ap.add_argument("--hf-split", default="train", help="HF split (e.g., train, validation, test)." )
    ap.add_argument("--prompt-column", default="prompt", help="Column that contains the prompt/question." )
    ap.add_argument("--context-column", default=None, help="Optional column for context (e.g., 'context' for contextual subset)." )
    ap.add_argument("--category-column", default="category", help="Optional column for category label." )
    ap.add_argument("--category-filter", default=None, help="Filter prompts to only this category value (e.g., 'cybercrime_intrusion')." )
    ap.add_argument("--start-index", type=int, default=0, help="Start row index (default: 0)." )
    ap.add_argument("--num-prompts", default="1", help="Number of prompts to run: 1, N, or ALL." )
    ap.add_argument("--shuffle", action="store_true", help="Shuffle before selecting window." )
    ap.add_argument("--seed", type=int, default=42, help="Seed for shuffling." )
    ap.add_argument("--max-output-tokens", type=int, default=4096, help="Max tokens for model answers." )
    ap.add_argument("--temperature", type=float, default=None, help="Sampling temperature (optional)." )
    ap.add_argument("--reasoning-effort", default=None, choices=[None, "low", "medium", "high"],
                    help="If set, try to use reasoning block for models that support it." )
    ap.add_argument("--base-url", default=None, help="Optional OpenAI base_url override." )
    ap.add_argument("--api-key", default=None, help="Override OPENAI_API_KEY for this run." )
    ap.add_argument("--judge-system-file", default=None, help="Path to a custom judge system prompt (optional)." )
    ap.add_argument("--info", "-i", action="store_true",
                    help="Show detailed processing information.")
    ap.add_argument("--debug", action="store_true",
                    help="Show debug information and full tracebacks.")
    ap.add_argument("--quiet", "-q", action="store_true",
                    help="Minimal output, only final results.")
    ap.add_argument("--log-file", default=None,
                    help="Optional path for a log file. Defaults to out/<dataset>_<config>/run.log")
    args = ap.parse_args()

    # Configure logging levels based on CLI flags
    if args.quiet:
        log_level = logging.CRITICAL
        console_log_level = logging.CRITICAL
    elif args.debug:
        log_level = logging.DEBUG
        console_log_level = logging.DEBUG
    elif args.info:
        log_level = logging.INFO
        console_log_level = logging.INFO
    else:
        log_level = logging.WARNING  # File logging still captures warnings
        console_log_level = logging.CRITICAL  # But console stays clean
    
    # Configure console logging - minimal by default
    logging.basicConfig(
        level=console_log_level,
        format="%(message)s",  # Clean format for console
        handlers=[logging.StreamHandler()] if not args.quiet else []
    )

    # Normalize model list allowing commas
    model_list = normalize_models_arg(args.models)
    if not model_list:
        raise SystemExit("No models provided via --models")

    # Model validation - check if all models are supported
    from utils.model_providers import validate_model_support, get_supported_models
    
    unsupported_models = [model for model in model_list if not validate_model_support(model)]
    if unsupported_models:
        supported = get_supported_models()
        print(f"\n❌ Unsupported models: {', '.join(unsupported_models)}")
        print(f"\n✅ Supported models by provider:")
        for provider, models in supported.items():
            print(f"  {provider.upper()}: {', '.join(models[:5])}{'...' if len(models) > 5 else ''}")
        return
    
    # Legacy arguments handling (base_url and api_key are now handled per-provider)
    if args.base_url or args.api_key:
        logger.warning(
            "--base-url and --api-key arguments are deprecated in multi-provider mode. "
            "Use provider-specific environment variables instead:"
            "\n  OpenAI: OPENAI_API_KEY"
            "\n  Anthropic: AWS_PROFILE (or AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), AWS_REGION"
            "\n  Google: GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION"
        )

    # Load judge system prompt
    judge_system = DEFAULT_JUDGE_SYSTEM
    if args.judge_system_file and Path(args.judge_system_file).exists():
        judge_system = Path(args.judge_system_file).read_text(encoding="utf-8")

    # Load HF dataset
    ds = load_dataset(args.hf_dataset, args.hf_config, split=args.hf_split)

    # Select rows
    indices = list(range(len(ds)))
    
    # Filter by category if specified
    if args.category_filter:
        filtered_indices = []
        for i in indices:
            rec = ds[i]
            cat = rec.get(args.category_column, None)
            if cat and str(cat).strip() == args.category_filter:
                filtered_indices.append(i)
        if not filtered_indices:
            raise SystemExit(f"No prompts found with category '{args.category_filter}'")
        indices = filtered_indices
        logger.info(f"Filtered to {len(indices)} prompts with category '{args.category_filter}'")
    
    if args.shuffle:
        random.seed(args.seed)
        random.shuffle(indices)
    start = max(0, int(args.start_index))
    if str(args.num_prompts).upper() == "ALL":
        take = len(indices) - start
    else:
        try:
            take = max(1, int(args.num_prompts))
        except Exception:
            take = 1
    sel = indices[start:start+take]

    # Prepare prompts
    rows: List[PromptRow] = []
    for i in sel:
        rec = ds[i]
        prompt = str(rec.get(args.prompt_column, "")).strip()
        if not prompt:
            continue
        ctx = None
        if args.context_column:
            ctx_val = rec.get(args.context_column, None)
            ctx = str(ctx_val).strip() if ctx_val is not None else None
        cat = rec.get(args.category_column, None)
        cat = str(cat).strip() if cat is not None else None
        rows.append(PromptRow(idx=i, prompt=prompt, context=ctx, category=cat))

    # Output dirs - dynamically generate from dataset name
    dataset_name = args.hf_dataset.split('/')[-1].lower()  # "raxITLabs/GrayZone" → "grayzone"
    root = Path("out") / f"{dataset_name}_{args.hf_config}"
    ensure_dir(root)
    # Add file handler for detailed logging
    try:
        log_path = Path(args.log_file) if args.log_file else (root / "run.log")
        fh = logging.FileHandler(log_path, encoding="utf-8")
        fh.setLevel(log_level)  # Use the file log level
        fh.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s"))
        logging.getLogger().addHandler(fh)
        if args.info or args.debug:
            console.print(f"[dim]Detailed logs: {log_path}[/dim]")
    except Exception as e:
        if args.info or args.debug:
            console.print(f"[yellow]Warning: Failed to set up file logging: {e}[/yellow]")

    # Track start time for elapsed time display
    start_time = datetime.now()
    
    # Choose display mode based on verbosity
    use_live_display = not (args.debug or args.info or args.quiet)
    
    # Show setup configuration (skip setup panel if using live display)
    if not args.quiet and not use_live_display:
        show_config_panel(
            args.hf_dataset, args.hf_config, model_list,
            args.judge_model, args.judge_task, len(rows),
            args.category_filter
        )
    
    # Run each model with progress tracking
    all_results: List[Dict[str, Any]] = []
    total_tasks = len(model_list) * len(rows)
    
    if use_live_display:
        # Use Professional Live display inspired by Claude Code
        live_display = ProfessionalBenchmarkDisplay(
            models=model_list,
            total_prompts=len(rows),
            judge_model=args.judge_model,
            judge_task=args.judge_task,
            dataset=args.hf_dataset,
            config=args.hf_config,
            split=args.hf_split,
            total_dataset_size=len(ds),
            category_filter=args.category_filter
        )
        
        with Live(live_display.generate_display(), refresh_per_second=2, console=console) as live:
            for model in model_list:
                model_dir = root / model.replace("/", "_")
                ensure_dir(model_dir)
                
                for row in rows:
                    uid = f"row{row.idx:06d}"
                    prompt_text = build_prompt_text(row, include_context=bool(args.context_column))
                    prompt_info = f"{row.category or 'prompt'} | #{row.idx}"
                    
                    # Update live display - start processing
                    live_display.update_progress(model, prompt_info, 'processing_prompt')
                    live.update(live_display.generate_display())
                    
                    # Process the prompt (same logic as before)
                    try:
                        answer_text, raw_json, usage = call_llm_response(
                            model=model, text=prompt_text, max_tokens=args.max_output_tokens,
                            temperature=args.temperature, reasoning_effort=args.reasoning_effort
                        )
                        status = "ok"
                        err = None
                    except Exception as e:
                        answer_text, raw_json, usage = "", {}, {}
                        if "400" in str(e) and "safety reasons" in str(e):
                            status = "api_blocked"
                        else:
                            status = "error"
                        err = str(e)
                    
                    # Judge
                    j: Dict[str, Any] = {}
                    try:
                        if args.judge_task in {"safety", "both"}:
                            # Update display - judging safety
                            live_display.update_progress(model, prompt_info, 'judging_safety')
                            live.update(live_display.generate_display())
                            
                            j_safety = grade_safety(args.judge_model, DEFAULT_SAFETY_GRADER_SYSTEM,
                                                    prompt_text, answer_text, row.category)
                            j["safety"] = j_safety
                        if args.judge_task in {"helpfulness", "both"}:
                            # Update display - judging helpfulness
                            live_display.update_progress(model, prompt_info, 'judging_helpfulness')
                            live.update(live_display.generate_display())
                            
                            j_help = grade_helpfulness(args.judge_model, DEFAULT_HELPFULNESS_GRADER_SYSTEM,
                                                       prompt_text, answer_text)
                            j["helpfulness"] = j_help
                        if not j:
                            j = judge_answer(args.judge_model, judge_system, prompt_text, model, answer_text)
                    except Exception as e:
                        if not j:
                            j = {"verdict": "INCONCLUSIVE", "rationale": f"judge_error: {e}", "raw": {}, "usage": {}}
                    
                    # Save local files for debugging
                    (model_dir / f"{uid}.response.json").write_text(json.dumps(raw_json, indent=2), encoding="utf-8")
                    try:
                        judge_raw_data = {}
                        if isinstance(j.get("safety"), dict) and "raw" in j["safety"]:
                            judge_raw_data["safety_raw"] = j["safety"]["raw"]
                        if isinstance(j.get("helpfulness"), dict) and "raw" in j["helpfulness"]:
                            judge_raw_data["helpfulness_raw"] = j["helpfulness"]["raw"]
                        if "raw" in j:
                            judge_raw_data["legacy_raw"] = j["raw"]
                        if not judge_raw_data:
                            judge_raw_data = j
                        (model_dir / f"{uid}.judge.response.json").write_text(json.dumps(judge_raw_data, indent=2, cls=ScoreBreakdownEncoder), encoding="utf-8")
                    except Exception as e:
                        logger.debug("Failed to write judge raw JSON for %s: %s", uid, e)
                    
                    # Markdown summary
                    md = [
                        f"# {dataset_name.title()} Sample {uid}",
                        f"- Timestamp: {now_iso()}",
                        f"- Model: `{model}`",
                        f"- Category: {row.category}",
                        f"- HF Index: {row.idx}",
                        f"- Status: {status}",
                        "",
                        "## Prompt",
                        "```",
                        prompt_text,
                        "```",
                        "",
                        "## Answer",
                        answer_text or "_<empty>_" if status != "api_blocked" else "_<API blocked for safety reasons>_",
                        "",
                        "## Judge",
                        *( [f"- Safety: {j.get('safety',{}).get('label','N/A')}"] if isinstance(j.get('safety'), dict) else [] ),
                        *( [f"- Helpfulness: {j.get('helpfulness',{}).get('score','N/A')}"] if isinstance(j.get('helpfulness'), dict) else [] ),
                        *( [f"- Verdict: **{j.get('verdict','INCONCLUSIVE')}**"] if 'verdict' in j else [] ),
                    ]
                    
                    # Add detailed analysis results to markdown
                    safety_data = j.get("safety", {}) or {}
                    helpfulness_data = j.get("helpfulness", {}) or {}
                    
                    if safety_data.get("detailed_safety_score") is not None:
                        md.extend([
                            "",
                            "### Detailed Analysis",
                            f"- **Safety Score**: {format_score(safety_data.get('detailed_safety_score'))} (confidence: {format_score(safety_data.get('confidence'))})",
                            f"- **Helpfulness Score**: {format_score(helpfulness_data.get('detailed_helpfulness_score'))} (confidence: {format_score(helpfulness_data.get('confidence'))})",
                        ])
                        
                        if safety_data.get("rationale"):
                            md.extend([
                                "",
                                "**Safety Rationale:**",
                                safety_data["rationale"]
                            ])
                        
                        if helpfulness_data.get("rationale"):
                            md.extend([
                                "",
                                "**Helpfulness Rationale:**",
                                helpfulness_data["rationale"]
                            ])
                        
                        # Add tier usage summary
                        safety_tiers = safety_data.get("tier_results", {})
                        helpfulness_tiers = helpfulness_data.get("tier_results", {})
                        if safety_tiers or helpfulness_tiers:
                            md.extend([
                                "",
                                "**Evaluation Tiers Used:**",
                                f"- Deterministic: {bool(safety_tiers.get('deterministic') or helpfulness_tiers.get('deterministic'))}",
                                f"- Moderation: {bool(safety_tiers.get('moderation') or helpfulness_tiers.get('moderation'))}",
                                f"- Agent: {bool(safety_tiers.get('agent') or helpfulness_tiers.get('agent'))}"
                            ])
                    
                    (model_dir / f"{uid}.md").write_text("\n".join(md), encoding="utf-8")
                    
                    # Build result item with all data
                    result_item = {
                        "hf_index": row.idx,
                        "category": row.category,
                        "model": model,
                        "status": status,
                        "verdict": j.get("verdict", None),
                        "safety": (j.get("safety", {}) or {}).get("label"),
                        "helpfulness": (j.get("helpfulness", {}) or {}).get("score"),
                        "input_tokens": (usage or {}).get("input_tokens") or 0,
                        "output_tokens": (usage or {}).get("output_tokens") or 0,
                    }
                    
                    # Add detailed analysis results (always enabled)
                    if True:  # Always include detailed analysis
                        safety_data = j.get("safety", {}) or {}
                        helpfulness_data = j.get("helpfulness", {}) or {}
                        
                        result_item.update({
                            "detailed_safety_score": safety_data.get("detailed_safety_score"),
                            "detailed_helpfulness_score": helpfulness_data.get("detailed_helpfulness_score"),
                            "safety_confidence": safety_data.get("confidence"),
                            "helpfulness_confidence": helpfulness_data.get("confidence"),
                            "safety_rationale": safety_data.get("rationale"),
                            "helpfulness_rationale": helpfulness_data.get("rationale"),
                            "safety_tier_results": safety_data.get("tier_results"),
                            "helpfulness_tier_results": helpfulness_data.get("tier_results"),
                        })
                    all_results.append(result_item)
                    
                    # Update live display with final result
                    live_display.update_progress(model, prompt_info, 'complete', result_item)
                    live.update(live_display.generate_display())
            
            # Save detailed results as JSON (inside live display context)
            results_file = root / f"results_{now_iso().replace(':','-')}.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(all_results, f, indent=2, ensure_ascii=False, cls=ScoreBreakdownEncoder)
            
            # Check if GCS upload is configured and show upload progress
            gcs_status = None
            import os
            if os.getenv("GCS_SERVICE_ACCOUNT") and os.getenv("GCS_BUCKET_NAME"):
                # Show upload starting
                live_display.set_gcs_status({'uploading': True, 'configured': True})
                live.update(live_display.generate_display())
                
                # Upload to GCS (complete upload each run for simplicity and reliability)
                def progress_callback(message):
                    live_display.set_gcs_status({'uploading': True, 'configured': True, 'message': message})
                    live.update(live_display.generate_display())
                
                try:
                    from utils.gcs_uploader import upload_results
                    gcs_status = upload_results(root, results_file, all_results, progress_callback)
                except Exception as e:
                    # Silent fail - GCS upload is optional
                    gcs_status = {'success': False, 'configured': True, 'error': str(e)}
                    logger.debug(f"GCS upload skipped: {e}")
                
                # Update display with final GCS status
                if gcs_status:
                    live_display.set_gcs_status(gcs_status)
                    live.update(live_display.generate_display())
                    
                    # Brief pause to let users see the final status with GCS upload info
                    import time
                    time.sleep(3)  # Reduced since we now show progress
    else:
        # Use simple progress bar for debug/info modes
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
            disable=args.quiet
        ) as progress:
            main_task = progress.add_task("Processing models...", total=total_tasks)
            for model in model_list:
                model_dir = root / model.replace("/", "_")
                ensure_dir(model_dir)

                for row in rows:
                    uid = f"row{row.idx:06d}"
                    prompt_text = build_prompt_text(row, include_context=bool(args.context_column))
                    
                    # Update progress description
                    progress.update(
                        main_task, 
                        description=f"Processing: {model} | {row.category} | #{row.idx}"
                    )
                    
                    if args.info:
                        console.print(f"[dim]Processing {model} on prompt {row.idx} ({row.category})[/dim]")
                    elif args.debug:
                        logger.info("Processing sample | model=%s uid=%s category=%s", model, uid, row.category)

                    # Call candidate model
                    try:
                        answer_text, raw_json, usage = call_llm_response(
                            model=model, text=prompt_text, max_tokens=args.max_output_tokens,
                            temperature=args.temperature, reasoning_effort=args.reasoning_effort
                        )
                        status = "ok"
                        err = None
                        if args.debug:
                            logger.debug(
                                "Model call ok | model=%s uid=%s answer_chars=%s usage=%s",
                                model, uid, len(answer_text or ""), usage or {},
                            )
                    except Exception as e:
                        answer_text, raw_json, usage = "", {}, {}
                        # Classify the type of error
                        if "400" in str(e) and "safety reasons" in str(e):
                            status = "api_blocked"
                            if args.info or args.debug:
                                console.print(f"[yellow]API blocked: {model} on prompt {row.idx}[/yellow]")
                            elif args.debug:
                                logger.warning("Model blocked by API policy | model=%s uid=%s", model, uid)
                        else:
                            status = "error"
                            if args.info or args.debug:
                                console.print(f"[red]Error: {model} on prompt {row.idx}: {str(e)[:100]}...[/red]")
                            elif args.debug:
                                logger.exception("Model call error | model=%s uid=%s: %s", model, uid, e)
                        err = str(e)

                    # Judge
                    j: Dict[str, Any] = {}
                    try:
                        if args.judge_task in {"safety", "both"}:
                            j_safety = grade_safety(args.judge_model, DEFAULT_SAFETY_GRADER_SYSTEM,
                                                    prompt_text, answer_text, row.category)
                            j["safety"] = j_safety
                        if args.judge_task in {"helpfulness", "both"}:
                            j_help = grade_helpfulness(args.judge_model, DEFAULT_HELPFULNESS_GRADER_SYSTEM,
                                                       prompt_text, answer_text)
                            j["helpfulness"] = j_help
                        if not j:
                            # Fallback to legacy verdict for backward compatibility
                            j = judge_answer(args.judge_model, judge_system, prompt_text, model, answer_text)
                    except Exception as e:
                        if args.debug:
                            logger.exception("Judge error | model=%s uid=%s: %s", model, uid, e)
                        elif args.info:
                            console.print(f"[yellow]Judge error for {model} on prompt {row.idx}[/yellow]")
                        if not j:
                            j = {"verdict": "INCONCLUSIVE", "rationale": f"judge_error: {e}", "raw": {}, "usage": {}}

                    # Save local files for debugging
                    (model_dir / f"{uid}.response.json").write_text(json.dumps(raw_json, indent=2), encoding="utf-8")
                    try:
                        judge_raw_data = {}
                        if isinstance(j.get("safety"), dict) and "raw" in j["safety"]:
                            judge_raw_data["safety_raw"] = j["safety"]["raw"]
                        if isinstance(j.get("helpfulness"), dict) and "raw" in j["helpfulness"]:
                            judge_raw_data["helpfulness_raw"] = j["helpfulness"]["raw"]
                        if "raw" in j:
                            judge_raw_data["legacy_raw"] = j["raw"]
                        if not judge_raw_data:
                            judge_raw_data = j
                        (model_dir / f"{uid}.judge.response.json").write_text(json.dumps(judge_raw_data, indent=2, cls=ScoreBreakdownEncoder), encoding="utf-8")
                    except Exception as e:
                        logger.debug("Failed to write judge raw JSON for %s: %s", uid, e)
                    
                    # Markdown summary
                    md = [
                        f"# {dataset_name.title()} Sample {uid}",
                        f"- Timestamp: {now_iso()}",
                        f"- Model: `{model}`",
                        f"- Category: {row.category}",
                        f"- HF Index: {row.idx}",
                        f"- Status: {status}",
                        "",
                        "## Prompt",
                        "```",
                        prompt_text,
                        "```",
                        "",
                        "## Answer",
                        answer_text or "_<empty>_" if status != "api_blocked" else "_<API blocked for safety reasons>_",
                        "",
                        "## Judge",
                        *( [f"- Safety: {j.get('safety',{}).get('label','N/A')}"] if isinstance(j.get('safety'), dict) else [] ),
                        *( [f"- Helpfulness: {j.get('helpfulness',{}).get('score','N/A')}"] if isinstance(j.get('helpfulness'), dict) else [] ),
                        *( [f"- Verdict: **{j.get('verdict','INCONCLUSIVE')}**"] if 'verdict' in j else [] ),
                    ]
                    
                    # Add detailed analysis results to markdown
                    safety_data = j.get("safety", {}) or {}
                    helpfulness_data = j.get("helpfulness", {}) or {}
                    
                    if safety_data.get("detailed_safety_score") is not None:
                        md.extend([
                            "",
                            "### Detailed Analysis",
                            f"- **Safety Score**: {format_score(safety_data.get('detailed_safety_score'))} (confidence: {format_score(safety_data.get('confidence'))})",
                            f"- **Helpfulness Score**: {format_score(helpfulness_data.get('detailed_helpfulness_score'))} (confidence: {format_score(helpfulness_data.get('confidence'))})",
                        ])
                        
                        if safety_data.get("rationale"):
                            md.extend([
                                "",
                                "**Safety Rationale:**",
                                safety_data["rationale"]
                            ])
                        
                        if helpfulness_data.get("rationale"):
                            md.extend([
                                "",
                                "**Helpfulness Rationale:**",
                                helpfulness_data["rationale"]
                            ])
                        
                        # Add tier usage summary
                        safety_tiers = safety_data.get("tier_results", {})
                        helpfulness_tiers = helpfulness_data.get("tier_results", {})
                        if safety_tiers or helpfulness_tiers:
                            md.extend([
                                "",
                                "**Evaluation Tiers Used:**",
                                f"- Deterministic: {bool(safety_tiers.get('deterministic') or helpfulness_tiers.get('deterministic'))}",
                                f"- Moderation: {bool(safety_tiers.get('moderation') or helpfulness_tiers.get('moderation'))}",
                                f"- Agent: {bool(safety_tiers.get('agent') or helpfulness_tiers.get('agent'))}"
                            ])
                    
                    (model_dir / f"{uid}.md").write_text("\n".join(md), encoding="utf-8")

                    # Build result item with all data
                    result_item = {
                        "hf_index": row.idx,
                        "category": row.category,
                        "model": model,
                        "status": status,
                        "verdict": j.get("verdict", None),
                        "safety": (j.get("safety", {}) or {}).get("label"),
                        "helpfulness": (j.get("helpfulness", {}) or {}).get("score"),
                        "input_tokens": (usage or {}).get("input_tokens") or 0,
                        "output_tokens": (usage or {}).get("output_tokens") or 0,
                    }
                    
                    # Add detailed analysis results (always enabled)
                    if True:  # Always include detailed analysis
                        safety_data = j.get("safety", {}) or {}
                        helpfulness_data = j.get("helpfulness", {}) or {}
                        
                        result_item.update({
                            "detailed_safety_score": safety_data.get("detailed_safety_score"),
                            "detailed_helpfulness_score": helpfulness_data.get("detailed_helpfulness_score"),
                            "safety_confidence": safety_data.get("confidence"),
                            "helpfulness_confidence": helpfulness_data.get("confidence"),
                            "safety_rationale": safety_data.get("rationale"),
                            "helpfulness_rationale": helpfulness_data.get("rationale"),
                            "safety_tier_results": safety_data.get("tier_results"),
                            "helpfulness_tier_results": helpfulness_data.get("tier_results"),
                        })
                    
                    all_results.append(result_item)
                    
                    # Update progress
                    progress.update(main_task, advance=1)

    # For non-live display modes, show traditional results
    if not use_live_display and not args.quiet:
        console.print("\n")
        results_table = create_results_table(all_results)
        console.print(results_table)
        console.print("\n")
        
        # Calculate total elapsed time
        elapsed = datetime.now() - start_time
        elapsed_str = str(elapsed).split('.')[0]
        
        # Show completion message
        show_completion_panel(str(root), elapsed_str)
    
    # Save detailed results and upload to GCS for non-live display modes
    if not use_live_display:
        # Save detailed results as JSON
        results_file = root / f"results_{now_iso().replace(':','-')}.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False, cls=ScoreBreakdownEncoder)
        
        # Upload to GCS if configured (complete upload each run for simplicity and reliability)
        try:
            from utils.gcs_uploader import upload_results
            upload_results(root, results_file, all_results)
        except Exception as e:
            # Silent fail - GCS upload is optional
            logger.debug(f"GCS upload skipped: {e}")
    
    if args.debug and not use_live_display:
        # Show results file path for debug mode
        console.print(f"[dim]Detailed results saved to: {root}/results_*.json[/dim]")

if __name__ == "__main__":
    main()
