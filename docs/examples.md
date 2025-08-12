# Usage Examples

Common patterns and advanced configurations for different research and evaluation scenarios.

## Quick Testing & Validation

### Single Prompt Smoke Test
Perfect for verifying setup and model access:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 1
```

### Multi-Model Quick Comparison
Compare several models on one prompt:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 1 \
  --info
```

### Debug Mode Testing
When troubleshooting issues:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 1 \
  --debug
```

## Standard Evaluation Runs

### Small Scale Evaluation (5-10 prompts)
Good for development and initial testing:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 10 \
  --shuffle --seed 42 \
  --info
```

### Medium Scale Evaluation (50-100 prompts)
Standard research evaluation size:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 50 \
  --shuffle --seed 42 \
  --info
```

### Large Scale Evaluation (Full Dataset)
Comprehensive evaluation across all available prompts:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts ALL \
  --info
```

## Specialized Research Scenarios

### Comparing Safety Paradigms
Compare traditional vs safe-completion models:

```bash
# Traditional model (more refusal-based)
uv run python gray-zone-bench.py \
  --models gpt-4-turbo \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --info

# Safe-completion model (more nuanced)
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --info
```

### Reasoning Model Analysis
Test reasoning-capable models with different effort levels:

```bash
# Standard reasoning
uv run python gray-zone-bench.py \
  --models o4-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --reasoning-effort medium \
  --num-prompts 25 \
  --info

# High-effort reasoning (slower, more thorough)
uv run python gray-zone-bench.py \
  --models o3-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --reasoning-effort high \
  --num-prompts 10 \
  --info
```

### Contextual Evaluation
Test dual-use scenarios with legitimate context:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --num-prompts 50 \
  --info
```

## Category-Specific Analysis

### Biological Risk Assessment
Focus on chemical/biological scenarios:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --category-filter chemical_biological \
  --num-prompts ALL \
  --info
```

### Cybersecurity Gray Zones
Evaluate cyber-related dual-use scenarios:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --category-filter cybercrime_intrusion \
  --num-prompts ALL \
  --info
```

### Physical Harm Scenarios
Test responses to physical violence prompts:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --category-filter physical_harm \
  --num-prompts ALL \
  --info
```

## Batch Processing Patterns

### Windowed Processing
Process dataset in chunks to manage resources:

```bash
# First batch: prompts 0-49
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --start-index 0 --num-prompts 50 \
  --info

# Second batch: prompts 50-99  
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --start-index 50 --num-prompts 50 \
  --info
```

### Randomized Sampling
Get representative sample across dataset:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --shuffle --seed 42 \
  --start-index 0 --num-prompts 100 \
  --info
```

## Advanced Configuration

### High-Precision Evaluation
Maximum quality settings for research publications:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --temperature 0.0 \
  --max-output-tokens 8192 \
  --num-prompts 100 \
  --shuffle --seed 42 \
  --info
```

### Cost-Optimized Evaluation
Minimize API costs while maintaining quality:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --max-output-tokens 2048 \
  --num-prompts 50 \
  --quiet
```

### Safety-Only Analysis
Focus exclusively on safety evaluation:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task safety \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --info
```

### Helpfulness-Only Analysis
Focus exclusively on helpfulness within safety constraints:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task helpfulness \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --info
```

## Output Management

### Custom Log Location
Direct logs to specific location:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 10 \
  --log-file /path/to/experiment.log \
  --info
```

### Silent Processing for Scripts
Minimal output suitable for automation:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 50 \
  --quiet
```

## Experimental Patterns

### Temperature Sensitivity Analysis
Study how sampling temperature affects gray zone navigation:

```bash
# Conservative (deterministic)
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --hf-dataset raxITLabs/GrayZone \
  --temperature 0.0 \
  --num-prompts 25 \
  --info

# Moderate creativity
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --hf-dataset raxITLabs/GrayZone \
  --temperature 0.7 \
  --num-prompts 25 \
  --info

# High creativity
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --hf-dataset raxITLabs/GrayZone \
  --temperature 1.0 \
  --num-prompts 25 \
  --info
```

### Cross-Provider Comparison
Compare models across different AI providers:

```bash
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --shuffle --seed 42 \
  --info
```

### Judge Model Sensitivity
Test how judge model choice affects evaluation:

```bash
# GPT judge
uv run python gray-zone-bench.py \
  --models claude-3-haiku \
  --judge-model gpt-5-mini \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 25 \
  --info

# Claude judge (via Bedrock)
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model claude-3-haiku \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 25 \
  --info
```

## Integration with Analysis Tools

### Results for Statistical Analysis
Generate clean output for further processing:

```bash
# Run evaluation
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --shuffle --seed 42 \
  --quiet

# Results are in out/harmbench_standard/results_*.json
# Load in Python/R for statistical analysis
```

### Longitudinal Evaluation
Track model performance over time:

```bash
# Save results with timestamp for comparison
DATE=$(date +%Y%m%d)
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 100 \
  --seed 42 \
  --log-file "logs/eval_${DATE}.log" \
  --info

# Compare results across dates
```

## Performance Optimization

### Parallel Processing
The tool automatically processes models in parallel, but you can optimize for your hardware:

```bash
# For high-memory systems, process more prompts
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 200 \
  --info

# For limited resources, use smaller batches
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --start-index 0 --num-prompts 25 \
  --info
```

These examples provide a foundation for various research scenarios. Adjust parameters based on your specific research questions, computational resources, and API rate limits.