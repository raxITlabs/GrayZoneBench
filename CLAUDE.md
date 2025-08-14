# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GrayZoneBench is an AI safety research tool that evaluates how models navigate the "gray zone" between helpful and harmful responses. The project implements OpenAI's safe-completion paradigm with advanced gray zone navigation assessment, featuring:

- **Multiplicative scoring**: effectiveness = helpfulness × safety (following OpenAI's approach)
- **Response mode detection**: Direct answer, safe-completion, constructive refusal analysis
- **Meaningful facilitation assessment**: Evaluation of whether responses materially lower barriers to harm
- **Gray zone navigation metrics**: Focus on ambiguous scenarios requiring nuanced responses
- **Three-tier evaluation system**: Deterministic rules, moderation API, and agent-based LLM judgment

## Development Commands

### Installation and Environment
```bash
# Install dependencies using uv (recommended)
uv sync

# Run the main benchmark script
uv run python gray-zone-bench.py [options]
```

### Core Benchmark Commands

**Quick smoke test (single prompt, multiple models):**
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini o4-mini o3-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset walledai/HarmBench --hf-config standard \
  --num-prompts 1
```

**Full evaluation with safety and helpfulness grading:**
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini,o4-mini,o3-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset walledai/HarmBench --hf-config standard \
  --num-prompts 50 \
  --info
```

**Contextual/dual-use evaluation:**
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini o4-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset walledai/HarmBench --hf-config contextual \
  --context-column context \
  --num-prompts 25
```

**Batch processing with window selection:**
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini o4-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset walledai/HarmBench --hf-config standard \
  --start-index 50 --num-prompts 25
```

## Architecture

### Core Components

**Main Entry Point:**
- `gray-zone-bench.py`: Primary CLI interface with comprehensive argument parsing and orchestration

**Utilities Package (`utils/`):**
- `llm_client.py`: Unified LLM interface using LangChain for multi-vendor support (OpenAI, Anthropic/Bedrock, Google)
- `model_providers.py`: Provider-specific model initialization and validation
- `judge.py`: Safety and helpfulness evaluation with configurable rubrics
- `data_processing.py`: HuggingFace dataset loading and prompt processing
- `cli_display.py`: Beautiful CLI output with Rich library integration
- `display.py`: Live progress display inspired by Claude Code interface
- `file_utils.py`: Result serialization and directory management
- `scoring_rubrics.py`: Three-tier evaluation logic (deterministic, moderation, agent-based)
- `agentic_evaluator.py`: Advanced agent-based evaluation workflows
- `deterministic_analyzer.py`: Rule-based safety/helpfulness analysis
- `openai_client.py`: Legacy OpenAI-specific client (being deprecated)
- `openai_moderation.py`: OpenAI moderation API integration

### Model Support Architecture
The system supports multiple AI providers through LangChain abstractions:
- **OpenAI**: GPT models, reasoning models (o1, o3), with reasoning_effort parameter support
- **Anthropic** (via Bedrock): Claude models using AWS credentials
- **Google**: Gemini models using Google Cloud credentials
- **Provider auto-detection**: Based on model naming patterns

### Evaluation Framework
- **Safety scoring**: Binary SAFE/UNSAFE classification with confidence scores
- **Helpfulness scoring**: 0-4 scale from complete refusal to full helpfulness
- **Three-tier evaluation**: Deterministic rules → Moderation API → Agent-based LLM judgment
- **Judge models**: Use separate LLMs to evaluate target model responses
- **Dual evaluation**: Both safety and helpfulness in single benchmark run

### Data Flow
1. Load prompts from HuggingFace datasets (`walledai/HarmBench` with multiple configs)
2. Process prompts with optional context and category filtering
3. Query multiple target models in parallel with error handling
4. Evaluate responses using judge models with three-tier scoring
5. Save detailed per-sample results to timestamped directories under `out/`
6. Display live progress or final summary tables

## Key Configuration Options

**Dataset Selection:**
- `--hf-dataset`: HuggingFace dataset (default: `walledai/HarmBench`)
- `--hf-config`: Subset selection (`standard`, `contextual`, `copyright`)
- `--context-column`: Include contextual information for dual-use scenarios
- `--category-filter`: Filter to specific harm categories

**Model Parameters:**
- `--models`: Space/comma-separated model list supporting multiple providers
- `--judge-model`: Model for safety/helpfulness evaluation
- `--judge-task`: What to evaluate (`safety`, `helpfulness`, `both`)
- `--max-output-tokens`: Response length limit (default: 4096)
- `--temperature`: Sampling temperature for model responses
- `--reasoning-effort`: For reasoning models (`low`, `medium`, `high`)

**Batch Processing:**
- `--num-prompts`: Number to process (`1`, `N`, or `ALL`)
- `--start-index`: Batch starting position for windowed processing
- `--shuffle`: Randomize prompt order with `--seed` for reproducibility

**Output Control:**
- `--info`: Show detailed processing information
- `--debug`: Debug mode with full tracebacks and detailed logging
- `--quiet`: Minimal output, results table only

## Environment Variables Required

**OpenAI:**
```bash
OPENAI_API_KEY=your_key_here
```

**Anthropic (Bedrock):**
```bash
AWS_PROFILE=your_profile
# OR
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

**Google (for Gemini models):**
```bash
GOOGLE_API_KEY=your_google_api_key_here
```

**Google Cloud Storage (Optional - for automatic result uploads):**
```bash
# Paste entire service account JSON as single line
GCS_SERVICE_ACCOUNT='{"type":"service_account","project_id":"..."}'
GCS_BUCKET_NAME=grayzonebench-results
```

## Output Structure

Results are automatically saved to timestamped directories:
```
out/
├── harmbench_standard/                     # Based on --hf-config
│   ├── gpt-5-mini/                        # Per-model directories
│   │   ├── row000001.md                   # Human-readable summary
│   │   ├── row000001.response.json        # Full model response
│   │   └── row000001.judge.response.json  # Judge evaluation with tier results
│   ├── results_2025-08-12T07-04-35.json  # Aggregate results with detailed scores
│   └── run.log                            # Execution logs
```

When GCS is configured, results are also uploaded to:
```
gs://your-bucket/
├── runs/
│   └── 2025-01-14T10-30-00/              # Timestamped run
│       ├── results.json                   # Aggregate results
│       └── models/                        # Individual model outputs
│           └── gpt-5-mini/
│               └── *.json
├── latest/
│   └── results.json                       # Most recent run results
└── index.json                            # Index of all runs
```

Each sample generates three files:
- **Markdown summary**: Human-readable analysis with rationales and tier usage
- **Response JSON**: Raw model output and usage statistics  
- **Judge JSON**: Evaluation results including confidence scores and tier breakdowns

## Research Context

This tool implements OpenAI's safe-completion paradigm from "From Hard Refusals to Safe-Completions: Toward Output-Centric Safety Training." Key evaluation dimensions:

- **Gray zone navigation**: Evaluates model performance in ambiguous scenarios between clearly safe and clearly harmful
- **Response mode effectiveness**: Assesses appropriateness and quality of direct-answer, safe-completion, and constructive-refusal modes
- **Meaningful facilitation threshold**: Determines whether responses materially lower barriers to harm
- **Multiplicative reward structure**: Uses effectiveness = helpfulness × safety as per OpenAI's approach
- **Output-centric safety**: Focus on response safety rather than input intent classification