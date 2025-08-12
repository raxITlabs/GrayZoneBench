# GrayZoneBench

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![UV](https://img.shields.io/badge/uv-Package%20Manager-green)](https://github.com/astral-sh/uv)
[![Dataset](https://img.shields.io/badge/🤗%20Dataset-raxITLabs%2FGrayZone-yellow)](https://huggingface.co/datasets/raxITLabs/GrayZone)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-available-brightgreen.svg)](docs/)
[![Code style: Python](https://img.shields.io/badge/code%20style-python-blue.svg)](https://www.python.org/dev/peps/pep-0008/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/raxITlabs/GrayZoneBench)

AI safety benchmark evaluating how models navigate the "gray zone" between helpful and harmful responses using OpenAI's safe-completion paradigm. Uses the enhanced [`raxITLabs/GrayZone`](https://huggingface.co/datasets/raxITLabs/GrayZone/viewer/standard) dataset - an improved [HarmBench](https://huggingface.co/datasets/walledai/HarmBench) copy with additional prompts and dual-use scenarios.

## How It Works

```mermaid
flowchart TD
    A[HuggingFace Dataset<br/>raxITLabs/GrayZone] --> B[Target Models<br/>GPT, Claude, Gemini]
    B --> C[Model Responses]
    C --> D[Three-Tier Evaluation]
    
    D --> E[Tier 1: Deterministic<br/>Rules & patterns<br/>10% weight]
    D --> F[Tier 2: Moderation API<br/>Content policy check<br/>Penalty factor]  
    D --> G[Tier 3: Agent-based<br/>LLM judge analysis<br/>90% weight]
    
    E --> H[Final Safety Score<br/>0.0 - 1.0]
    F --> H
    G --> H
    
    E --> I[Final Helpfulness Score<br/>0.0 - 1.0] 
    F --> I
    G --> I
    
    H --> J[Effectiveness Score<br/>Safety × Helpfulness]
    I --> J
    
    J --> K[Results Dashboard<br/>Live progress + analysis]
    J --> L[Output Files<br/>JSON, Markdown, Logs]
```

## Benchmark Overview

![Benchmark Dashboard](docs/assets/image.png)

*Real-time benchmark dashboard showing safety/helpfulness scores, model comparisons, and comprehensive analysis summary with three-tier evaluation results.*

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

## Demo

![GrayZoneBench Demo](docs/assets/demo.gif)


## Documentation

- **[How It Works](docs/how-it-works.md)** - Three-tier evaluation system and gray zone navigation
- **[Configuration](docs/configuration.md)** - CLI options, environment setup, model support  
- **[Understanding Results](docs/understanding-results.md)** - Output interpretation and analysis
- **[Examples](docs/examples.md)** - Common usage patterns and advanced configurations
- **[Research Background](docs/research-background.md)** - OpenAI safe-completion paradigm and citations