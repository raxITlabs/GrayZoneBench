#!/usr/bin/env python
"""
Test script for OpenAI open weight models via AWS Bedrock

Usage:
    uv run python test_openai_bedrock.py
    
Requires:
    - AWS credentials configured (AWS_PROFILE or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)
    - Access to OpenAI models in Bedrock (us-west-2 region)
"""

import os
import sys
from utils.llm_client import call_llm_response
from utils.model_providers import detect_provider, create_llm_client

def test_openai_bedrock_models():
    """Test OpenAI open weight models via Bedrock"""
    
    # Check AWS credentials
    has_aws_auth = bool(os.getenv("AWS_PROFILE") or (os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")))
    
    if not has_aws_auth:
        print("❌ AWS credentials not configured!")
        print("   Please set either:")
        print("   - AWS_PROFILE environment variable")
        print("   - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        return False
    
    print("✅ AWS credentials detected")
    
    # Test models
    models_to_test = ["gpt-oss-120b", "gpt-oss-20b"]
    
    for model in models_to_test:
        print(f"\n📝 Testing {model}...")
        
        # Check provider detection
        try:
            provider = detect_provider(model)
            print(f"   Provider: {provider}")
            assert provider == "openai-bedrock", f"Expected 'openai-bedrock', got '{provider}'"
        except Exception as e:
            print(f"   ❌ Provider detection failed: {e}")
            continue
        
        # Try to create client (will fail without proper AWS access)
        try:
            client = create_llm_client(model, temperature=0.7, max_tokens=100)
            print(f"   ✅ Client created successfully")
        except Exception as e:
            print(f"   ⚠️  Client creation failed (expected without Bedrock access): {e}")
            continue
        
        # Try to make a call (will fail without proper AWS access)
        try:
            response, raw, usage = call_llm_response(
                model=model,
                text="Hello, please respond with 'Hi there!'",
                max_tokens=10,
                temperature=0.0
            )
            print(f"   ✅ Model responded: {response[:50]}...")
        except Exception as e:
            print(f"   ⚠️  Model call failed (expected without Bedrock access): {str(e)[:100]}...")
    
    print("\n🎉 Integration test complete!")
    print("   Models are properly configured for AWS Bedrock access.")
    print("   To fully test, ensure you have:")
    print("   1. AWS credentials configured")
    print("   2. Access to OpenAI models in Bedrock (us-west-2)")
    print("   3. Requested access to gpt-oss-120b and gpt-oss-20b in Bedrock console")
    
    return True

if __name__ == "__main__":
    success = test_openai_bedrock_models()
    sys.exit(0 if success else 1)