# Contributing to GrayZoneBench

We welcome contributions to GrayZoneBench! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [License](#license)

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors
- Respect different viewpoints and experiences

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes
5. Make your changes
6. Test your changes
7. Submit a pull request

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- Clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (Python version, OS, model versions)
- Relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- Clear description of the enhancement
- Use cases and benefits
- Possible implementation approach
- Any relevant examples or mockups

### Contributing Code

We welcome contributions in the following areas:

- **New evaluation metrics**: Additional ways to assess gray zone navigation
- **Model integrations**: Support for new AI providers or models
- **Analysis tools**: Better visualization or interpretation of results
- **Performance improvements**: Optimization of evaluation speed or accuracy
- **Documentation**: Improvements to docs, examples, or code comments
- **Bug fixes**: Resolving issues in the codebase

## Development Setup

### Prerequisites

- Python 3.13 or higher
- [uv](https://github.com/astral-sh/uv) package manager

### Setup Instructions

```bash
# Clone your fork
git clone https://github.com/yourusername/GrayZoneBench.git
cd GrayZoneBench

# Install dependencies
uv sync

# Set up environment variables (copy from .env.example if available)
# OPENAI_API_KEY=your_key_here
# AWS_PROFILE=your_profile  # for Claude via Bedrock
# GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json  # for Gemini

# Run a quick test
uv run python gray-zone-bench.py --models gpt-5-mini --judge-model gpt-5-mini --judge-task both --hf-dataset raxITLabs/GrayZone --num-prompts 1
```

## Coding Standards

### Python Style

- Follow PEP 8 guidelines
- Use type hints where appropriate
- Keep functions focused and well-documented
- Use meaningful variable and function names

### Documentation

- Document all public functions and classes
- Include docstrings with parameter descriptions
- Update relevant documentation files when making changes
- Add examples for new features

### Project Structure

```
GrayZoneBench/
├── gray-zone-bench.py          # Main CLI entry point
├── utils/                      # Core utilities
│   ├── llm_client.py          # LLM interface
│   ├── judge.py               # Evaluation logic
│   ├── data_processing.py     # Dataset handling
│   └── ...
├── docs/                       # Documentation
├── out/                        # Results output (gitignored)
└── tests/                      # Test files (when added)
```

## Testing

Currently, the project uses manual testing. When contributing:

1. Test your changes with multiple models and configurations
2. Verify edge cases and error handling
3. Check that existing functionality still works
4. Document any new testing procedures

### Manual Test Commands

```bash
# Quick smoke test
uv run python gray-zone-bench.py --models gpt-5-mini --judge-model gpt-5-mini --judge-task both --hf-dataset raxITLabs/GrayZone --num-prompts 1 --debug

# Multi-model test
uv run python gray-zone-bench.py --models gpt-5-mini claude-3-haiku --judge-model gpt-5-mini --judge-task both --hf-dataset raxITLabs/GrayZone --num-prompts 3 --info

# Contextual evaluation test
uv run python gray-zone-bench.py --models gpt-5-mini --judge-model gpt-5-mini --judge-task both --hf-dataset raxITLabs/GrayZone --hf-config contextual --context-column context --num-prompts 2 --info
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test thoroughly** using the manual testing procedures

4. **Update documentation** as needed

5. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git commit -m "Add support for new evaluation metric

   - Implement contextual safety scoring
   - Add tests for edge cases
   - Update documentation with examples"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to any related issues
   - Description of changes and testing performed
   - Screenshots or examples if applicable

### Commit Message Format

Use clear, descriptive commit messages:

- Start with a capitalized verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 50 characters
- Provide additional details in the body if needed
- Reference issues using "Fixes #123" or "Relates to #123"

Examples:
```
Add support for Gemini Flash models

Fix safety score calculation for edge cases

Update documentation for new CLI options

- Add examples for contextual evaluation
- Clarify environment setup instructions
- Fix typos in configuration docs
```

## Contribution Areas

### High Priority

- **Test coverage**: Adding automated tests
- **CI/CD**: Setting up automated testing and linting
- **Performance**: Optimizing evaluation speed
- **Error handling**: Improving robustness and error messages

### Medium Priority

- **New models**: Adding support for additional AI providers
- **Analysis tools**: Better result visualization and interpretation
- **Documentation**: More examples and tutorials
- **Logging**: Enhanced debugging and monitoring capabilities

### Research Contributions

- **Evaluation metrics**: New ways to assess gray zone navigation
- **Benchmarking datasets**: Additional test scenarios
- **Comparative studies**: Analysis across different model families
- **Safety research**: Novel approaches to AI safety evaluation

## Review Process

All contributions go through review:

1. Automated checks (when CI is set up)
2. Code review by maintainers
3. Testing by reviewers
4. Discussion and iteration as needed
5. Merge when approved

Reviews focus on:
- Code quality and maintainability
- Adherence to project standards
- Functionality and testing
- Documentation completeness
- Security considerations

## Getting Help

If you need help with contributions:

- Check existing documentation in the `docs/` folder
- Review similar code in the project
- Ask questions in GitHub issues or discussions
- Reach out to maintainers

## Recognition

Contributors will be acknowledged in:
- Git commit history
- CONTRIBUTORS file (when created)
- Release notes for significant contributions
- Project documentation where appropriate

Thank you for contributing to GrayZoneBench! Your efforts help improve AI safety research and evaluation.

## License

By contributing to GrayZoneBench, you agree that your contributions will be licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.