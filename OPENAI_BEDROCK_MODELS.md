# OpenAI Open Weight Models via AWS Bedrock

## Overview

GrayZoneBench now supports OpenAI's open weight models (`gpt-oss-120b` and `gpt-oss-20b`) that are available through AWS Bedrock. These models offer:

- **Open weights**: Full control over model deployment and customization
- **128K context window**: Support for long documents and conversations
- **Adjustable reasoning levels**: low/medium/high reasoning effort
- **Text generation and reasoning**: Optimized for coding, scientific analysis, and mathematical reasoning

## Supported Models

| Model | Parameters | Bedrock Model ID | Description |
|-------|------------|------------------|-------------|
| `gpt-oss-120b` | 120B | `openai.gpt-oss-120b-1:0` | Larger model with better reasoning capabilities |
| `gpt-oss-20b` | 20B | `openai.gpt-oss-20b-1:0` | Smaller, faster model for efficient inference |

## Setup

### 1. Configure AWS Credentials

```bash
# Option 1: Use AWS Profile (recommended)
export AWS_PROFILE="your_profile_name"

# Option 2: Use direct credentials
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
```

### 2. Request Model Access in Bedrock

1. Go to the [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in us-west-2 region
3. Request access to:
   - `openai.gpt-oss-120b-1:0`
   - `openai.gpt-oss-20b-1:0`

### 3. Run Evaluation

```bash
# Evaluate both models
uv run python gray-zone-bench.py \
  --models gpt-oss-120b gpt-oss-20b \
  --judge-model gpt-5-mini \
  --judge-task both \
  --hf-dataset raxITLabs/GrayZone \
  --num-prompts 10

# Compare with other models
uv run python gray-zone-bench.py \
  --models gpt-oss-120b gpt-5-mini claude-3-haiku \
  --judge-model gpt-5-mini \
  --judge-task both \
  --num-prompts 5
```

## Implementation Details

The integration uses:
- **LangChain AWS**: `ChatBedrockConverse` client for Bedrock integration
- **Fixed Region**: Models are only available in `us-west-2`
- **Provider Detection**: Automatically routes `gpt-oss-*` models to Bedrock

### Code Changes

1. **Model Provider Mapping**: Added `openai-bedrock` as a new provider type
2. **Client Creation**: New `_create_openai_bedrock_client()` function
3. **Auto-detection**: Pattern matching for `gpt-oss` prefix

## Testing

Run the included test script to verify your setup:

```bash
uv run python test_openai_bedrock.py
```

This will check:
- AWS credentials configuration
- Provider detection logic
- Client creation (requires Bedrock access to fully test)

## Limitations

- **Region**: Only available in `us-west-2` AWS region
- **Access**: Requires approved access in AWS Bedrock
- **Pricing**: Standard AWS Bedrock pricing applies
- **Features**: Some OpenAI-specific features may not be available

## Troubleshooting

### AWS Credentials Not Found
```
Error: AWS authentication required for OpenAI models via Bedrock
```
**Solution**: Configure AWS credentials as shown in Setup section

### Model Not Available
```
Error: Model openai.gpt-oss-120b-1:0 not found
```
**Solution**: Request model access in AWS Bedrock console (us-west-2)

### Wrong Region
```
Error: Model not available in region us-east-1
```
**Solution**: The models are only available in us-west-2. The code automatically uses this region.

## References

- [AWS Blog: OpenAI Open Weight Models on AWS](https://aws.amazon.com/blogs/aws/openai-open-weight-models-now-available-on-aws/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [LangChain AWS Integration](https://python.langchain.com/docs/integrations/platforms/aws/)