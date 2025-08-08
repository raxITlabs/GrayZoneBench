"""
Data processing utilities for GrayZoneBench

Functions for handling datasets, prompts, and model arguments.
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class PromptRow:
    idx: int
    prompt: str
    category: Optional[str] = None
    context: Optional[str] = None


def normalize_models_arg(models: List[str]) -> List[str]:
    """
    Accepts: ["gpt-5-mini,o4-mini", "o3-mini"] or ["gpt-5-mini", "o4-mini"]
    Returns: ["gpt-5-mini","o4-mini","o3-mini"]
    """
    flat: List[str] = []
    for item in models:
        parts = [s.strip() for s in item.split(",") if s.strip()]
        if parts:
            flat.extend(parts)
        else:
            flat.append(item)
    # remove duplicates but keep order
    seen = set()
    ordered = []
    for m in flat:
        if m not in seen:
            seen.add(m)
            ordered.append(m)
    return ordered


def build_prompt_text(row: PromptRow, include_context: bool = False) -> str:
    if include_context and row.context:
        return f"Context:\n{row.context}\n\nQuestion:\n{row.prompt}"
    return row.prompt