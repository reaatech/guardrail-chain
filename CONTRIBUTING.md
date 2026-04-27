# Contributing to Guardrail Chain

Thank you for your interest in contributing to Guardrail Chain! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior:

- The use of sexualized language or imagery and unwelcome sexual attention
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/guardrail-chain.git`
3. Navigate to the project: `cd guardrail-chain`
4. Install dependencies: `pnpm install`
5. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### Installation

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format
```

### Project Structure

```
guardrail-chain/
├── src/                    # Source code
│   ├── core/              # Core chain engine
│   ├── guardrails/        # Built-in guardrails
│   ├── config/            # Configuration system
│   ├── observability/     # Logging, metrics, tracing
│   └── utils/             # Utilities and helpers
├── tests/                 # Test files
├── examples/              # Usage examples
└── skills/                # Agent skill documentation
```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed and what behavior you expected
- Include error messages and stack traces if applicable
- Include screenshots if possible

### Suggesting Features

Feature suggestions are tracked as GitHub issues. When creating a feature suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the suggested feature
- Explain why this feature would be useful
- List some examples of how this feature would be used
- Discuss any potential drawbacks or alternatives

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- **Good First Issues**: Issues labeled `good first issue` are a great place to start
- **Help Wanted**: Issues labeled `help wanted` are looking for contributions
- **Documentation**: Improving documentation is always appreciated

### Contributing Guardrails

To contribute a new guardrail:

1. Create a new file in `src/guardrails/input/` or `src/guardrails/output/`
2. Implement the `Guardrail` interface
3. Add comprehensive tests
4. Add documentation and examples
5. Update the main exports

Example guardrail structure:

```typescript
// src/guardrails/input/my-custom-guardrail.ts
import type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';

export class MyCustomGuardrail implements Guardrail<string, string> {
  readonly id = 'my-custom-guardrail';
  readonly name = 'My Custom Guardrail';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 5000;

  constructor(private config: MyGuardrailConfig = {}) {}

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      // Your guardrail logic here
      const passed = true;
      const output = input;

      return {
        passed,
        output,
        confidence: 0.95,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        passed: false,
        metadata: {
          duration: Date.now() - startTime,
        },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
```

## Coding Standards

### TypeScript

- Use strict mode (`strict: true` in tsconfig.json)
- Avoid `any` type — use `unknown` with type guards instead
- Use interfaces for object shapes
- Use type guards for type narrowing
- Prefer `const` over `let`
- Use async/await for asynchronous code

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Maximum line length: 100 characters
- Use trailing commas in multi-line objects/arrays
- **ESM-only**: All imports must include the `.js` extension (`import { foo } from './bar.js'`)

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for classes and types
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that explain the purpose

### Comments

- Use JSDoc comments for public APIs
- Explain **why** not **what** (code should be self-documenting)
- Keep comments up-to-date
- Remove commented-out code before committing

### Error Handling

- Use custom error classes for different error types
- Include context in error messages
- Log errors appropriately
- Never swallow errors silently

## Testing

### Test Structure

- Place tests in `tests/` directory or alongside source files with `.test.ts` extension
- Use descriptive test names
- Test both happy paths and error cases
- Mock external dependencies
- Aim for high test coverage (>95%)

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm test tests/unit/my-guardrail.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyCustomGuardrail } from '../src/guardrails/input/my-custom-guardrail.js';

describe('MyCustomGuardrail', () => {
  let guardrail: MyCustomGuardrail;

  beforeEach(() => {
    guardrail = new MyCustomGuardrail();
  });

  it('should pass valid input', async () => {
    const input = 'valid input';
    const context = createMockContext();

    const result = await guardrail.execute(input, context);

    expect(result.passed).toBe(true);
    expect(result.output).toBe(input);
  });

  it('should fail invalid input', async () => {
    const input = 'invalid input';
    const context = createMockContext();

    const result = await guardrail.execute(input, context);

    expect(result.passed).toBe(false);
  });
});
```

## Documentation

### Code Documentation

- Document all public APIs with JSDoc
- Include parameter descriptions and return types
- Provide examples for complex functions
- Document any side effects or important behaviors

### Examples

- Add usage examples in the `examples/` directory
- Include both simple and advanced use cases
- Document configuration options
- Show error handling patterns

### README Updates

When adding new features or guardrails:

- Update the main README.md
- Add to the table of contents if needed
- Include code examples
- Document any breaking changes

## Pull Request Process

1. **Update Documentation**: Ensure all documentation is updated
2. **Add Tests**: Add tests for new functionality
3. **Update CHANGELOG**: Add entry to CHANGELOG.md if applicable
4. **Run Tests**: Ensure all tests pass
5. **Lint Code**: Run `pnpm lint` and fix any issues
6. **Format Code**: Run `pnpm format` to ensure consistent formatting
7. **Request Review**: Request review from maintainers

### PR Title Guidelines

- Use conventional commits format:
  - `feat: add new guardrail`
  - `fix: resolve timeout issue`
  - `docs: update README`
  - `refactor: improve chain engine`
  - `test: add unit tests`
  - `chore: update dependencies`

### PR Description Template

```markdown
## Description

Brief description of the changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe the testing done and results

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added and passing
- [ ] No new warnings or errors
```

## Community

### Communication

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion

### Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Annual contributor spotlight blog posts

### Becoming a Maintainer

Active contributors who consistently provide high-quality contributions may be invited to become maintainers. Maintainers have:

- Write access to the repository
- Ability to review and merge PRs
- Input on project direction
- Responsibility to uphold community standards

## Legal

By contributing to Guardrail Chain, you agree that your contributions will be licensed under the MIT License. You also agree that your contributions are your original work and you have the right to submit them under the MIT License.

## Questions?

If you have any questions about contributing, please:

1. Check existing documentation
2. Search existing issues and discussions
3. Ask in GitHub Discussions

Thank you for contributing to Guardrail Chain!
