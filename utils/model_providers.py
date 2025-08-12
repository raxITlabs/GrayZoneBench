"""
Model Provider Detection and Client Factory for Multi-Vendor LLM Support

Supports OpenAI, Anthropic (via Bedrock), Google models, and OpenAI open weight models (via Bedrock) through unified LangChain interface.
"""

import os
import logging
from typing import Optional, Union
from functools import lru_cache

# LangChain imports for different providers
from langchain_openai import ChatOpenAI
from langchain_aws import ChatBedrockConverse  
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger(__name__)

# Model name to provider mapping
PROVIDER_MAPPING = {
    # OpenAI models - Latest 2025
    "gpt-4o": "openai", 
    "gpt-4o-mini": "openai",
    "gpt-4.1-mini": "openai",
    "gpt-4.1-nano": "openai",
    "gpt-5": "openai",
    "gpt-5-pro": "openai",
    "gpt-5-mini": "openai",
    "gpt-5-nano": "openai",
    "o3": "openai",
    "o3-mini": "openai",
    "o4-mini": "openai",
    
    # OpenAI open weight models (via Bedrock) - Available in us-west-2
    "gpt-oss-120b": "openai-bedrock",
    "gpt-oss-20b": "openai-bedrock",
    "openai.gpt-oss-120b-1:0": "openai-bedrock",
    "openai.gpt-oss-20b-1:0": "openai-bedrock",
    
    # Anthropic models (via Bedrock) - Latest 2025 + Haiku 3/3.5
    "claude-3-haiku": "anthropic",
    "claude-3-5-haiku": "anthropic",
    "claude-3-5-sonnet": "anthropic",
    "claude-3-7-sonnet": "anthropic",
    "claude-opus-4": "anthropic",
    "claude-sonnet-4": "anthropic",
    "claude-opus-4-1": "anthropic",
    # Bedrock model IDs with us. prefix
    "us.anthropic.claude-3-haiku-20240307-v1:0": "anthropic",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0": "anthropic",
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0": "anthropic",
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0": "anthropic",
    "us.anthropic.claude-opus-4-20250514-v1:0": "anthropic",
    "us.anthropic.claude-sonnet-4-20250514-v1:0": "anthropic",
    "us.anthropic.claude-opus-4-1-20250805-v1:0": "anthropic",
    
    # Google models - Gemini 2.0 and 2.5 series with specific variants
    # Both dash and dot formats supported for compatibility
    "gemini-2.0-flash": "google",
    "gemini-2.0-pro": "google",
    "gemini-2.0-flash-lite-001": "google",
    "gemini-2.0-flash-001": "google",
    "gemini-2.5-pro": "google",
    "gemini-2.5-flash": "google",
    "gemini-2.5-flash-lite": "google",
    # Correct dot format
    "gemini-2-0-flash": "google",
    "gemini-2-0-pro": "google", 
    "gemini-2-0-flash-lite-001": "google",
    "gemini-2-0-flash-001": "google",
    "gemini-2-5-pro": "google",
    "gemini-2-5-flash": "google",
    "gemini-2-5-flash-lite": "google",
    # With models/ prefix
    "models/gemini-2.0-flash": "google",
    "models/gemini-2.0-pro": "google",
    "models/gemini-2.0-flash-lite-001": "google",
    "models/gemini-2.0-flash-001": "google",
    "models/gemini-2.5-pro": "google",
    "models/gemini-2.5-flash": "google",
    "models/gemini-2.5-flash-lite": "google",
}

def detect_provider(model_name: str) -> str:
    """
    Detect which provider a model belongs to based on its name.
    
    Args:
        model_name: The model name to check
        
    Returns:
        Provider name: 'openai', 'anthropic', 'google', or 'openai-bedrock'
        
    Raises:
        ValueError: If model is not supported
    """
    # Direct lookup first
    if model_name in PROVIDER_MAPPING:
        return PROVIDER_MAPPING[model_name]
    
    # Fallback pattern matching
    model_lower = model_name.lower()
    
    # Check for OpenAI open weight models via Bedrock first
    if "gpt-oss" in model_lower or "openai.gpt-oss" in model_lower:
        return "openai-bedrock"
    elif any(pattern in model_lower for pattern in ["gpt", "o3", "o4"]):
        return "openai"
    elif any(pattern in model_lower for pattern in ["claude", "anthropic"]):
        return "anthropic" 
    elif any(pattern in model_lower for pattern in ["gemini", "bard"]):
        return "google"
    
    raise ValueError(
        f"Unsupported model: {model_name}. "
        f"Supported providers: OpenAI, Anthropic (Bedrock), Google, OpenAI (Bedrock)"
    )

@lru_cache(maxsize=32)
def create_llm_client(model_name: str, **kwargs) -> Union[ChatOpenAI, ChatBedrockConverse, ChatGoogleGenerativeAI]:
    """
    Create appropriate LangChain LLM client based on model name.
    
    Args:
        model_name: Name of the model to use
        **kwargs: Additional parameters (temperature, max_tokens, etc.)
        
    Returns:
        Configured LangChain LLM client
        
    Raises:
        ValueError: If model is not supported or credentials are missing
    """
    provider = detect_provider(model_name)
    
    # Set default max_tokens if not provided
    if "max_tokens" not in kwargs:
        kwargs["max_tokens"] = 4096
    
    if provider == "openai":
        return _create_openai_client(model_name, **kwargs)
    elif provider == "openai-bedrock":
        return _create_openai_bedrock_client(model_name, **kwargs)
    elif provider == "anthropic":
        return _create_anthropic_client(model_name, **kwargs)
    elif provider == "google":
        return _create_google_client(model_name, **kwargs)
    else:
        raise ValueError(f"Unknown provider: {provider}")

def _create_openai_client(model_name: str, **kwargs) -> ChatOpenAI:
    """Create OpenAI client with proper configuration."""
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError(
            "OPENAI_API_KEY environment variable is required for OpenAI models. "
            "Get your API key from https://platform.openai.com/api-keys"
        )
    
    # Extract parameters from kwargs
    temperature = kwargs.pop("temperature", None)
    max_tokens = kwargs.pop("max_tokens", 4096)
    
    # Build client arguments
    client_kwargs = {
        "model": model_name,
        "max_tokens": max_tokens,
    }
    
    if temperature is not None:
        client_kwargs["temperature"] = temperature
    
    # Add any remaining kwargs
    client_kwargs.update(kwargs)
        
    logger.debug(f"Creating OpenAI client for model: {model_name}")
    return ChatOpenAI(**client_kwargs)

def _create_anthropic_client(model_name: str, **kwargs) -> ChatBedrockConverse:
    """Create Anthropic client via AWS Bedrock."""
    # Check for AWS profile or direct credentials
    aws_profile = os.getenv("AWS_PROFILE")
    has_direct_creds = os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if not aws_profile and not has_direct_creds:
        raise ValueError(
            "AWS authentication required for Bedrock. Either set:\n"
            "  - AWS_PROFILE environment variable (recommended), or\n"
            "  - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n"
            "Also ensure AWS_REGION is set (default: us-east-1)"
        )
    
    # Extract parameters from kwargs
    temperature = kwargs.pop("temperature", None)
    max_tokens = kwargs.pop("max_tokens", 4096)
    
    # Map short names to full Bedrock model IDs if needed
    bedrock_model_mapping = {
        "claude-3-haiku": "us.anthropic.claude-3-haiku-20240307-v1:0",
        "claude-3-5-haiku": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        "claude-3-5-sonnet": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        "claude-3-7-sonnet": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        "claude-opus-4": "us.anthropic.claude-opus-4-20250514-v1:0",
        "claude-sonnet-4": "us.anthropic.claude-sonnet-4-20250514-v1:0",
        "claude-opus-4-1": "us.anthropic.claude-opus-4-1-20250805-v1:0",
    }
    
    bedrock_model = bedrock_model_mapping.get(model_name, model_name)
    
    # Build client arguments
    client_kwargs = {
        "model": bedrock_model,
        "max_tokens": max_tokens,
        "region_name": os.getenv("AWS_REGION", "us-east-1"),
    }
    
    # AWS profile will be automatically used from AWS_PROFILE env var by boto3
    if aws_profile:
        logger.debug(f"Using AWS profile from environment: {aws_profile}")
    
    if temperature is not None:
        client_kwargs["temperature"] = temperature
    
    # Add any remaining kwargs
    client_kwargs.update(kwargs)
        
    logger.debug(f"Creating Anthropic/Bedrock client for model: {bedrock_model}")
    return ChatBedrockConverse(**client_kwargs)

def _create_openai_bedrock_client(model_name: str, **kwargs) -> ChatBedrockConverse:
    """Create OpenAI open weight model client via AWS Bedrock."""
    # Check for AWS profile or direct credentials
    aws_profile = os.getenv("AWS_PROFILE")
    has_direct_creds = os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if not aws_profile and not has_direct_creds:
        raise ValueError(
            "AWS authentication required for OpenAI models via Bedrock. Either set:\n"
            "  - AWS_PROFILE environment variable (recommended), or\n"
            "  - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n"
            "Note: OpenAI open weight models are only available in us-west-2 region"
        )
    
    # Extract parameters from kwargs
    temperature = kwargs.pop("temperature", None)
    max_tokens = kwargs.pop("max_tokens", 4096)
    
    # Map short names to full Bedrock model IDs if needed
    openai_bedrock_model_mapping = {
        "gpt-oss-120b": "openai.gpt-oss-120b-1:0",
        "gpt-oss-20b": "openai.gpt-oss-20b-1:0",
    }
    
    bedrock_model = openai_bedrock_model_mapping.get(model_name, model_name)
    
    # Build client arguments
    # OpenAI open weight models are only available in us-west-2
    client_kwargs = {
        "model": bedrock_model,
        "max_tokens": max_tokens,
        "region_name": "us-west-2",  # Fixed region for OpenAI models
    }
    
    # AWS profile will be automatically used from AWS_PROFILE env var by boto3
    if aws_profile:
        logger.debug(f"Using AWS profile from environment: {aws_profile}")
    
    if temperature is not None:
        client_kwargs["temperature"] = temperature
    
    # Add any remaining kwargs
    client_kwargs.update(kwargs)
        
    logger.debug(f"Creating OpenAI/Bedrock client for model: {bedrock_model} in us-west-2")
    return ChatBedrockConverse(**client_kwargs)

def _create_google_client(model_name: str, **kwargs) -> ChatGoogleGenerativeAI:
    """Create Google client with proper configuration."""
    # Check for API key
    if not os.getenv("GOOGLE_API_KEY"):
        raise ValueError(
            "GOOGLE_API_KEY environment variable is required for Google models. "
            "Get your API key from https://aistudio.google.com/app/apikey"
        )
    
    # Extract parameters from kwargs
    temperature = kwargs.pop("temperature", None)
    max_tokens = kwargs.pop("max_tokens", 4096)
    
    # Convert dash format to dot format for API compatibility
    if "gemini-2-" in model_name:
        model_name = model_name.replace("gemini-2-5", "gemini-2.5")
        model_name = model_name.replace("gemini-2-0", "gemini-2.0")
    
    # Ensure model name has proper format
    if not model_name.startswith("models/"):
        if model_name.startswith("gemini"):
            model_name = f"models/{model_name}"
    
    # Build client arguments - Google uses max_output_tokens instead of max_tokens
    client_kwargs = {
        "model": model_name,
        "max_output_tokens": max_tokens,
    }
    
    if temperature is not None:
        client_kwargs["temperature"] = temperature
    
    # Add any remaining kwargs
    client_kwargs.update(kwargs)
        
    logger.debug(f"Creating Google client for model: {model_name}")
    return ChatGoogleGenerativeAI(**client_kwargs)

def get_supported_models() -> dict:
    """
    Get dictionary of supported models organized by provider.
    
    Returns:
        Dict with provider names as keys and model lists as values
    """
    supported = {"openai": [], "anthropic": [], "google": [], "openai-bedrock": []}
    
    for model, provider in PROVIDER_MAPPING.items():
        if provider in supported:
            supported[provider].append(model)
            
    return supported

def validate_model_support(model_name: str) -> bool:
    """
    Check if a model is supported.
    
    Args:
        model_name: Model name to validate
        
    Returns:
        True if supported, False otherwise
    """
    try:
        detect_provider(model_name)
        return True
    except ValueError:
        return False