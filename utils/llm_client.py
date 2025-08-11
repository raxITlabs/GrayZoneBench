"""
Unified LLM Client for Multi-Vendor Support

Provides a unified interface for OpenAI, Anthropic (Bedrock), and Google models
through LangChain, replacing the OpenAI SDK-specific implementation.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langchain_core.language_models.chat_models import BaseChatModel

from .model_providers import create_llm_client, detect_provider

logger = logging.getLogger(__name__)


def call_llm_response(model: str, text: Optional[str] = None, max_tokens: int = 4096,
                      temperature: Optional[float] = None,
                      reasoning_effort: Optional[str] = None,
                      messages: Optional[List[Dict[str, str]]] = None,
                      instructions: Optional[str] = None) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Unified wrapper for LLM calls across multiple providers via LangChain.
    
    Args:
        model: Model name (e.g., 'gpt-4', 'claude-3-sonnet', 'gemini-pro')
        text: Simple text input (converted to user message)
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature (0.0 to 1.0)
        reasoning_effort: Ignored (OpenAI Responses API specific)
        messages: List of message dicts with 'role' and 'content' keys
        instructions: System instructions (converted to system message)
        
    Returns:
        Tuple of (output_text, raw_response_dict, usage_dict)
        
    Raises:
        ValueError: If model is not supported or configuration is invalid
        Exception: For API errors from the underlying provider
    """
    # Determine provider and validate model
    try:
        provider = detect_provider(model)
        logger.debug(f"Detected provider '{provider}' for model '{model}'")
    except ValueError as e:
        logger.error(f"Model detection failed: {e}")
        raise
    
    # Build message list
    langchain_messages = []
    
    # Add system instructions if provided
    if instructions:
        langchain_messages.append(SystemMessage(content=instructions))
    
    # Convert messages to LangChain format
    if messages is not None:
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            
            if role == "system":
                langchain_messages.append(SystemMessage(content=content))
            elif role in ["user", "human"]:
                langchain_messages.append(HumanMessage(content=content))
            elif role in ["assistant", "ai"]:
                # Some providers support assistant messages, but for simplicity
                # we'll treat them as human messages in this context
                logger.warning(f"Converting assistant message to human message for compatibility")
                langchain_messages.append(HumanMessage(content=content))
            else:
                logger.warning(f"Unknown message role '{role}', treating as human message")
                langchain_messages.append(HumanMessage(content=content))
    
    # Add simple text input as user message
    if text:
        langchain_messages.append(HumanMessage(content=text))
    
    # Ensure we have at least one message
    if not langchain_messages:
        raise ValueError("No messages provided - need either 'text' or 'messages' parameter")
    
    # Calculate approximate input characters for logging
    approx_chars = sum(len(msg.content) for msg in langchain_messages)
    
    # Log reasoning_effort warning if provided
    if reasoning_effort:
        logger.warning(
            f"reasoning_effort='{reasoning_effort}' is not supported in unified LangChain interface. "
            f"Parameter ignored. Use OpenAI Responses API directly for reasoning models."
        )
    
    logger.debug(
        f"UNIFIED_LLM: Preparing {provider} call | model={model} max_tokens={max_tokens} "
        f"temp={temperature} input_msgs={len(langchain_messages)} input_chars={approx_chars}"
    )
    
    # Create LLM client
    try:
        llm_client = create_llm_client(
            model_name=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
    except Exception as e:
        logger.error(f"Failed to create LLM client for {provider}/{model}: {e}")
        raise
    
    # Make the API call
    try:
        response = llm_client.invoke(langchain_messages)
    except Exception as e:
        logger.error(f"LLM call failed for {provider}/{model}: {e}")
        raise
    
    # Extract response text
    text_out = ""
    if hasattr(response, 'content') and response.content:
        text_out = response.content.strip()
    else:
        logger.warning(f"Empty response from {provider}/{model}")
    
    # Extract usage information
    usage = {}
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        # LangChain standard usage format - usage_metadata is a dictionary
        metadata = response.usage_metadata
        usage = {
            "input_tokens": metadata.get('input_tokens'),
            "output_tokens": metadata.get('output_tokens'), 
            "total_tokens": metadata.get('total_tokens'),
        }
    elif hasattr(response, 'response_metadata') and response.response_metadata:
        # Alternative usage location for some providers
        metadata = response.response_metadata
        usage = {
            "input_tokens": metadata.get('input_tokens'),
            "output_tokens": metadata.get('output_tokens'),
            "total_tokens": metadata.get('total_tokens'),
        }
    
    # Create raw JSON representation
    raw_json = {}
    try:
        # Try to get the full response as dict
        if hasattr(response, 'dict'):
            raw_json = response.dict()
        elif hasattr(response, '__dict__'):
            # Fallback to object dict
            raw_json = {
                "id": getattr(response, 'id', None),
                "content": text_out,
                "model": model,
                "provider": provider,
                "usage": usage,
                "response_metadata": getattr(response, 'response_metadata', {}),
            }
        else:
            raw_json = {"content": text_out, "model": model, "provider": provider}
    except Exception as e:
        logger.debug(f"Failed to serialize response to JSON: {e}")
        raw_json = {"content": text_out, "model": model, "provider": provider, "error": str(e)}
    
    # Logging
    if not text_out:
        logger.warning(
            f"Empty model answer | model={model} provider={provider} usage={usage}"
        )
        logger.debug(f"Full response for empty output: {raw_json}")
    else:
        logger.debug(
            f"Model answer received | model={model} provider={provider} chars={len(text_out)} "
            f"preview={repr(text_out[:100])}"
        )
    
    return text_out, raw_json, usage


def get_provider_info(model: str) -> Dict[str, Any]:
    """
    Get provider information for a given model.
    
    Args:
        model: Model name to check
        
    Returns:
        Dict with provider info including supported features
    """
    try:
        provider = detect_provider(model)
        
        provider_info = {
            "provider": provider,
            "model": model,
            "supports_streaming": True,
            "supports_functions": False,  # Would need more complex detection
            "supports_vision": False,     # Would need model-specific detection
        }
        
        # Provider-specific capabilities
        if provider == "openai":
            provider_info.update({
                "supports_functions": True,
                "supports_vision": "gpt-4" in model.lower() and "vision" in model.lower(),
                "api_base": "https://api.openai.com/v1",
            })
        elif provider == "anthropic":
            provider_info.update({
                "supports_functions": True,
                "api_base": "AWS Bedrock",
            })
        elif provider == "google":
            provider_info.update({
                "supports_functions": True,
                "supports_vision": "pro" in model.lower(),
                "api_base": "https://generativelanguage.googleapis.com",
            })
            
        return provider_info
        
    except ValueError as e:
        return {"error": str(e), "model": model}


def validate_model_availability(model: str) -> bool:
    """
    Test if a model is available by making a minimal API call.
    
    Args:
        model: Model name to test
        
    Returns:
        True if model is available, False otherwise
    """
    try:
        # Make minimal test call
        response_text, _, _ = call_llm_response(
            model=model,
            text="Test",
            max_tokens=1,
            temperature=0.0
        )
        return bool(response_text)
    except Exception as e:
        logger.debug(f"Model availability check failed for {model}: {e}")
        return False


# Legacy compatibility function name (for gradual migration)
def call_openai_response(*args, **kwargs):
    """
    Legacy compatibility wrapper - redirects to call_llm_response.
    
    Note: 'client' parameter is ignored in the new implementation.
    """
    # Remove 'client' parameter if present (no longer needed)
    if 'client' in kwargs:
        logger.warning("'client' parameter is deprecated and ignored in unified LLM interface")
        kwargs.pop('client')
    
    # If first arg was client, remove it
    if args and hasattr(args[0], '__class__') and 'openai' in str(args[0].__class__).lower():
        logger.warning("First positional 'client' argument is deprecated and ignored")
        args = args[1:]
    
    return call_llm_response(*args, **kwargs)