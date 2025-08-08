"""
OpenAI client utilities for GrayZoneBench

Robust wrapper around OpenAI Responses API with error handling.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from openai import OpenAI

logger = logging.getLogger(__name__)


def call_openai_response(client: OpenAI, model: str, text: Optional[str] = None, max_tokens: int = 2048,
                         temperature: Optional[float] = None,
                         reasoning_effort: Optional[str] = None,
                         messages: Optional[List[Dict[str, str]]] = None,
                         instructions: Optional[str] = None) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Robust wrapper around the Responses API to support both reasoning and non-reasoning models.
    Returns (output_text, raw_json, usage_dict). On failure, output_text may be ''.
    """
    if messages is not None:
        input_payload = messages
        approx_chars = sum(len(str(m.get("content", ""))) for m in messages)
    else:
        input_payload = [
            {"role": "user", "content": text or ""}
        ]
        approx_chars = len(text or "")

    logger.debug(
        "UPDATED_VERSION: Preparing OpenAI Responses call | model=%s max_tokens=%s temp=%s reasoning_effort=%s input_msgs=%s input_chars=%s",
        model, max_tokens, temperature, reasoning_effort, (len(messages) if messages is not None else 1), approx_chars,
    )

    # Build request parameters
    kwargs: Dict[str, Any] = {
        "model": model,
        "max_output_tokens": max_tokens,
        "input": input_payload,
    }
    if instructions:
        kwargs["instructions"] = instructions
    if temperature is not None:
        kwargs["temperature"] = temperature
    if reasoning_effort and reasoning_effort.lower() in {"low", "medium", "high"}:
        kwargs["reasoning"] = {"effort": reasoning_effort}

    try:
        raw = client.responses.create(**kwargs)
    except Exception as e:
        if logger.isEnabledFor(logging.DEBUG):
            logger.exception("OpenAI Responses call failed: %s", e)
        else:
            logger.error("OpenAI Responses call failed: %s", e)
        raise

    # Extract text from response
    text_out = ""
    try:
        # Use the SDK's output_text property (preferred method)
        if hasattr(raw, "output_text") and raw.output_text:
            text_out = raw.output_text.strip()
        else:
            # Fallback: manually extract text from output structure
            chunks_all: List[str] = []
            for output_item in getattr(raw, "output", []) or []:
                for c in getattr(output_item, "content", []) or []:
                    c_text = getattr(c, "text", None)
                    if isinstance(c_text, str) and c_text:
                        chunks_all.append(c_text)
            text_out = ("\n".join(chunks_all)).strip()
    except Exception:
        text_out = ""

    # Usage
    usage = {}
    try:
        if hasattr(raw, "usage") and raw.usage:
            usage = {
                "input_tokens": getattr(raw.usage, "input_tokens", None),
                "output_tokens": getattr(raw.usage, "output_tokens", None),
                "total_tokens": getattr(raw.usage, "total_tokens", None),
            }
    except Exception:
        usage = {}

    # Pack raw JSON
    try:
        raw_json = json.loads(raw.model_dump_json())
    except Exception:
        raw_json = {}

    if not text_out:
        logger.warning(
            "Empty model answer | model=%s; raw.output present=%s; usage=%s",
            model, bool(getattr(raw, "output", None)), usage or {},
        )
        # Enhanced debug logging for empty responses
        logger.debug("Full raw response for empty output: %s", raw_json)
    else:
        logger.debug("Model answer received | model=%s chars=%s preview=%r", model, len(text_out), text_out[:200])

    return text_out, raw_json, usage