# GrayZoneBench

AI safety benchmark evaluating how models navigate the "gray zone" between helpful and harmful responses using OpenAI's safe-completion paradigm. Uses the enhanced [`raxITLabs/GrayZone`](https://huggingface.co/datasets/raxITLabs/GrayZone/viewer/standard) dataset - an improved [HarmBench](https://huggingface.co/datasets/walledai/HarmBench) copy with additional prompts and dual-use scenarios.

## How It Works

```mermaid
flowchart TD
    A[HuggingFace Dataset<br/>raxITLabs/GrayZone] --> B[Target Models<br/>GPT, Claude, Gemini]
    B --> C[Model Responses]
    C --> D[Three-Tier Evaluation]
    
    D --> E[Tier 1: Deterministic<br/>Rules & patterns]
    D --> F[Tier 2: Moderation API<br/>Content policy check]  
    D --> G[Tier 3: Agent-based<br/>LLM judge analysis]
    
    E --> H[Safety Score<br/>0.0 - 1.0]
    F --> H
    G --> H
    
    E --> I[Helpfulness Score<br/>0.0 - 1.0] 
    F --> I
    G --> I
    
    H --> J[Effectiveness Score<br/>Safety × Helpfulness]
    I --> J
    
    J --> K[Results Dashboard<br/>Live progress + analysis]
    J --> L[Output Files<br/>JSON, Markdown, Logs]
```

## Quick Start

```bash
# Install dependencies
uv sync

# Minimal test - single model
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config standard \
  --num-prompts 1

# Multi-model comparison
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku gemini-2-5-flash \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 1

# Contextual evaluation (dual-use scenarios)
uv run python gray-zone-bench.py \
  --models gpt-5-mini \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --num-prompts 1

# Category-specific analysis
uv run python gray-zone-bench.py \
  --models gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --hf-config contextual \
  --context-column context \
  --category-filter cybercrime_intrusion \
  --num-prompts 1
```

## Documentation

- **[How It Works](docs/how-it-works.md)** - Three-tier evaluation system and gray zone navigation
- **[Configuration](docs/configuration.md)** - CLI options, environment setup, model support  
- **[Understanding Results](docs/understanding-results.md)** - Output interpretation and analysis
- **[Examples](docs/examples.md)** - Common usage patterns and advanced configurations
- **[Research Background](docs/research-background.md)** - OpenAI safe-completion paradigm and citations