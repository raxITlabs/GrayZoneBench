# Configuration Guide

Complete reference for configuring GrayZoneBench runs with all available CLI options and environment setup.

## Environment Setup

### Required API Keys

**OpenAI Models (GPT-4, GPT-4o, o1, o3 series):**
```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

**Anthropic Models via AWS Bedrock (Claude series):**
```bash
export AWS_PROFILE="your_aws_profile"
# OR
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key" 
export AWS_REGION="us-east-1"
```

**Google Models (Gemini series):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
export GOOGLE_CLOUD_PROJECT="your_project_id"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

### Installation

```bash
# Install dependencies using uv (recommended)
uv sync

# Verify installation
uv run python gray-zone-bench.py --help
```

## CLI Arguments Reference

### Model Selection

**`--models`** (required)
Space or comma-separated list of models to evaluate.

```bash
# Space-separated
--models gpt-4o-mini claude-3-haiku gemini-1.5-flash

# Comma-separated  
--models gpt-4o-mini,claude-3-haiku,gemini-1.5-flash
```

**`--judge-model`** (required)
Model used to evaluate target model responses.

```bash
--judge-model gpt-4o-mini
```

**`--judge-task`** 
What aspects to evaluate: `safety`, `helpfulness`, or `both` (default).

```bash
--judge-task both        # Evaluate both safety and helpfulness
--judge-task safety      # Only safety evaluation  
--judge-task helpfulness # Only helpfulness evaluation
```

### Dataset Configuration

**`--hf-dataset`**
HuggingFace dataset to use (default: `raxITLabs/GrayZone`).

```bash
--hf-dataset raxITLabs/GrayZone
```

**`--hf-config`**
Dataset subset/configuration to use.

```bash
--hf-config standard    # Core harmful prompts
--hf-config contextual  # Enhanced dual-use scenarios with context
--hf-config copyright   # IP and content generation
```

**`--hf-split`**
Dataset split to use (default: `train`).

```bash
--hf-split train
--hf-split test
```

**`--context-column`**
Include contextual information from this column (useful for contextual config).

```bash
--context-column context
```

**`--category-filter`**
Filter to specific harm category.

```bash
--category-filter chemical_biological
--category-filter cybercrime_intrusion  
--category-filter physical_harm
```

### Prompt Processing

**`--num-prompts`**
Number of prompts to process: `1`, `N` (integer), or `ALL`.

```bash
--num-prompts 1      # Single prompt (good for testing)
--num-prompts 50     # Process 50 prompts  
--num-prompts ALL    # Process entire dataset
```

**`--start-index`**
Starting row index for batch processing (default: 0).

```bash
--start-index 100    # Start from row 100
```

**`--shuffle`**
Randomize prompt order before selection.

```bash
--shuffle --seed 42  # Shuffle with reproducible seed
```

### Model Parameters

**`--max-output-tokens`**
Maximum response length (default: 4096).

```bash
--max-output-tokens 2048
--max-output-tokens 8192
```

**`--temperature`**
Sampling temperature for response generation.

```bash
--temperature 0.0    # Deterministic
--temperature 0.7    # Balanced creativity
--temperature 1.0    # High creativity
```

**`--reasoning-effort`**
Reasoning intensity for capable models (o1, o3 series).

```bash
--reasoning-effort low     # Faster, less thorough
--reasoning-effort medium  # Balanced
--reasoning-effort high    # Slower, more thorough
```

### Output Control

**`--info`** / **`-i`**
Show detailed processing information.

```bash
--info               # Detailed progress information
```

**`--debug`**
Show debug information and full tracebacks.

```bash
--debug             # Maximum verbosity for troubleshooting
```

**`--quiet`** / **`-q`**
Minimal output, only show final results table.

```bash
--quiet             # Clean output for scripts/automation
```

**`--log-file`**
Custom log file path (default: `out/harmbench_<config>/run.log`).

```bash
--log-file /path/to/custom.log
```

## Supported Models

### OpenAI
- `gpt-4o`, `gpt-4o-mini`
- `gpt-4-turbo`, `gpt-4`
- `gpt-3.5-turbo`
- `o1-preview`, `o1-mini` (reasoning models)
- `o3-mini` (reasoning model)

### Anthropic (via Bedrock)
- `claude-3-opus`
- `claude-3-sonnet`, `claude-3-haiku`
- `claude-3-5-sonnet`, `claude-3-5-haiku`

### Google
- `gemini-1.5-pro`, `gemini-1.5-flash`
- `gemini-1.0-pro`

*Note: Model availability depends on your API access and regional restrictions.*

## Common Configuration Patterns

### Quick Testing
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 1
```

### Production Evaluation
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --info \
  --shuffle --seed 42
```

### Contextual Analysis
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --num-prompts 50
```

### Category-Specific Research
```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --category-filter cybercrime_intrusion \
  --num-prompts ALL \
  --info
```

## Output Structure

Results are automatically saved to timestamped directories:

```
out/
├── grayzone_standard/                     # Based on --hf-config  
│   ├── gpt-5-mini/                       # Per-model directories
│   │   ├── row000001.md                   # Human-readable summary
│   │   ├── row000001.response.json        # Full model response
│   │   └── row000001.judge.response.json  # Judge evaluation
│   ├── results_2025-08-12T07-04-35.json  # Aggregate results
│   └── run.log                            # Execution logs
```

## Performance Considerations

- **Concurrent processing**: Models are evaluated in parallel for efficiency
- **Rate limiting**: Built-in handling for API rate limits and retries
- **Memory usage**: Large datasets are processed incrementally
- **Cost optimization**: Use smaller judge models for cost control

## Troubleshooting

### Common Issues

**Authentication errors**: Verify environment variables are set correctly
**Model not found**: Check model availability in your region/plan
**Rate limiting**: Reduce concurrency or add delays between requests
**Memory issues**: Process smaller batches with `--start-index` and `--num-prompts`

### Debug Mode

Use `--debug` for detailed error information:
```bash
uv run python gray-zone-bench.py --debug --models gpt-5-mini --judge-model gpt-5-mini --hf-dataset raxITLabs/GrayZone --num-prompts 1
```