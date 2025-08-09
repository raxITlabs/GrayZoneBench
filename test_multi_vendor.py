#!/usr/bin/env python3
"""
Test script for multi-vendor LLM support

This script validates that the unified LLM client can handle different providers correctly.
Run this after setting up the appropriate environment variables for each provider.
"""

import os
import sys
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Add utils to path
sys.path.append(str(Path(__file__).parent / "utils"))

from utils.model_providers import detect_provider, validate_model_support, get_supported_models
from utils.llm_client import call_llm_response, get_provider_info

def test_provider_detection():
    """Test provider detection for different models."""
    print("🔍 Testing provider detection...")
    
    test_cases = [
        ("gpt-4o", "openai"),
        ("gpt-5", "openai"), 
        ("o3", "openai"),
        ("claude-3-7-sonnet", "anthropic"),
        ("claude-opus-4-1", "anthropic"),
        ("gemini-2.5-pro", "google"),
        ("gemini-2.0-flash", "google"),
    ]
    
    for model, expected_provider in test_cases:
        try:
            detected = detect_provider(model)
            status = "✅" if detected == expected_provider else "❌"
            print(f"  {status} {model} -> {detected} (expected: {expected_provider})")
        except Exception as e:
            print(f"  ❌ {model} -> ERROR: {e}")
    
    print()

def test_model_validation():
    """Test model support validation."""
    print("🔍 Testing model validation...")
    
    valid_models = ["gpt-4o", "claude-3-7-sonnet", "gemini-2.5-pro"]
    invalid_models = ["fake-model", "unsupported-llm"]
    
    for model in valid_models:
        is_valid = validate_model_support(model)
        status = "✅" if is_valid else "❌"
        print(f"  {status} {model} (should be supported)")
    
    for model in invalid_models:
        is_valid = validate_model_support(model)
        status = "❌" if is_valid else "✅"
        print(f"  {status} {model} (should be unsupported)")
    
    print()

def test_supported_models():
    """Display all supported models by provider."""
    print("📋 Supported models by provider:")
    
    supported = get_supported_models()
    for provider, models in supported.items():
        print(f"  {provider.upper()}: {len(models)} models")
        for model in models[:3]:  # Show first 3
            print(f"    - {model}")
        if len(models) > 3:
            print(f"    ... and {len(models) - 3} more")
    print()

def test_provider_info():
    """Test provider info retrieval."""
    print("ℹ️ Testing provider info retrieval...")
    
    test_models = ["gpt-4o", "claude-3-7-sonnet", "gemini-2.5-pro"]
    
    for model in test_models:
        try:
            info = get_provider_info(model)
            print(f"  📊 {model}:")
            print(f"    Provider: {info.get('provider', 'unknown')}")
            print(f"    Streaming: {info.get('supports_streaming', 'unknown')}")
            print(f"    Functions: {info.get('supports_functions', 'unknown')}")
        except Exception as e:
            print(f"  ❌ {model} -> ERROR: {e}")
    print()

def test_credential_checking():
    """Test credential availability for each provider."""
    print("🔐 Testing credential availability...")
    
    # OpenAI
    if os.getenv("OPENAI_API_KEY"):
        print("  ✅ OpenAI: OPENAI_API_KEY found")
    else:
        print("  ⚠️  OpenAI: Missing OPENAI_API_KEY")
    
    # Anthropic/Bedrock - support both AWS Profile and direct credentials
    aws_profile = os.getenv("AWS_PROFILE")
    aws_direct = os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_region = os.getenv("AWS_REGION")
    
    if aws_profile:
        print(f"  ✅ Anthropic/Bedrock: AWS_PROFILE='{aws_profile}' found")
        if not aws_region:
            print("  ⚠️  Anthropic/Bedrock: AWS_REGION not set (will use us-east-1)")
    elif aws_direct:
        print("  ✅ Anthropic/Bedrock: Direct AWS credentials found")
        if not aws_region:
            print("  ⚠️  Anthropic/Bedrock: AWS_REGION not set (will use us-east-1)")
    else:
        print("  ⚠️  Anthropic/Bedrock: Missing AWS_PROFILE or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY")
    
    # Google AI
    google_api_key = os.getenv("GOOGLE_API_KEY")
    
    if google_api_key:
        print("  ✅ Google AI: GOOGLE_API_KEY found")
    else:
        print("  ⚠️  Google AI: Missing GOOGLE_API_KEY")
    
    print()

def test_actual_api_call():
    """Test actual API calls if credentials are available."""
    print("🌐 Testing actual API calls...")
    
    # Only test models where we have credentials
    test_models = []
    
    if os.getenv("OPENAI_API_KEY"):
        test_models.append("gpt-4o-mini")
    
    # Check for AWS credentials (profile or direct)
    has_aws_creds = (os.getenv("AWS_PROFILE") or 
                     (os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")))
    if has_aws_creds:
        test_models.append("claude-3-5-haiku")
        
    # Check for Google AI credentials  
    if os.getenv("GOOGLE_API_KEY"):
        test_models.append("gemini-2.5-flash-lite")
    
    if not test_models:
        print("  ⚠️  No credentials available for API testing")
        print("  💡 Set environment variables to test actual API calls:")
        print("     - OPENAI_API_KEY for OpenAI models")
        print("     - AWS_PROFILE (or AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY), AWS_REGION for Anthropic")
        print("     - GOOGLE_API_KEY for Google models")
        return
    
    for model in test_models:
        try:
            print(f"  🔄 Testing {model}...")
            response, raw_json, usage = call_llm_response(
                model=model,
                text="Hello! Respond with just 'Hi there!' and nothing else.",
                max_tokens=10,
                temperature=0.0
            )
            
            if response:
                print(f"  ✅ {model}: '{response.strip()}' (tokens: {usage.get('total_tokens', 'unknown')})")
            else:
                print(f"  ⚠️  {model}: Empty response")
                
        except Exception as e:
            print(f"  ❌ {model}: {str(e)[:100]}")
    
    print()

def main():
    """Run all tests."""
    print("🧪 Multi-Vendor LLM Support Test Suite")
    print("=" * 50)
    
    test_provider_detection()
    test_model_validation()
    test_supported_models()
    test_provider_info()
    test_credential_checking()
    test_actual_api_call()
    
    print("🏁 Test suite complete!")
    print("\n💡 To run the benchmark with multi-vendor support:")
    print("   uv run python gray-zone-bench.py \\")
    print("     --models gpt-5 claude-opus-4-1 gemini-2-5-pro \\")
    print("     --judge-model gpt-5 \\")
    print("     --judge-task both \\")
    print("     --num-prompts 1")

if __name__ == "__main__":
    main()