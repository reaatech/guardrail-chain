# Skill: Writing and Updating Documentation

This skill covers best practices for writing and maintaining documentation for the Guardrail Chain project.

## Documentation Philosophy

Good documentation is:

1. **Clear**: Easy to understand for the target audience
2. **Complete**: Covers all necessary topics without gaps
3. **Accurate**: Reflects the current state of the codebase
4. **Accessible**: Easy to find and navigate
5. **Maintainable**: Easy to update as the project evolves

## Documentation Types

### 1. API Documentation (JSDoc)

Use JSDoc comments for all public APIs:

````typescript
/**
 * Executes a guardrail chain on the provided input.
 *
 * This method processes the input through all configured guardrails in sequence,
 * respecting budget constraints and short-circuit logic.
 *
 * @param input - The input string to process through the chain
 * @param options - Optional execution options including userId and sessionId
 * @returns A promise that resolves to the chain result with metrics
 * @throws {TimeoutError} If execution exceeds the configured timeout
 * @throws {BudgetExceededError} If the budget is exceeded during execution
 *
 * @example
 * ```typescript
 * const chain = new GuardrailChain({ budget: { maxLatencyMs: 1000 } });
 * const result = await chain.execute(userInput, { userId: '123' });
 *
 * if (result.passed) {
 *   console.log('Input approved');
 * } else {
 *   console.log(`Failed at: ${result.failedGuardrail}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using with custom guardrails
 * const chain = new ChainBuilder()
 *   .withGuardrail(new PIIRedaction())
 *   .withGuardrail(new ToxicityFilter())
 *   .build();
 *
 * const result = await chain.execute('user input');
 * ```
 */
async execute(input: string, options?: ExecutionOptions): Promise<ChainResult> {
  // Implementation
}
````

### 2. README Documentation

The main README.md should include:

- Project overview and value proposition
- Quick start guide
- Installation instructions
- Basic usage examples
- Configuration examples
- Contributing guidelines
- License information

````markdown
# Guardrail Chain

A modular, budget-aware pipeline framework for composing input/output guardrails in AI/LLM applications.

## Features

- **Composable Pipeline**: Chain multiple guardrails with configurable short-circuit logic
- **Budget-Aware**: Respect latency and token budgets
- **Production-Ready**: Enterprise-grade TypeScript with comprehensive error handling
- **Extensible**: Clear interface for custom guardrails

## Quick Start

```bash
npm install guardrail-chain
```
````

```typescript
import { GuardrailChain } from 'guardrail-chain';

const chain = new GuardrailChain({
  budget: { maxLatencyMs: 1000, maxTokens: 4000 },
  guardrails: [
    { id: 'pii-redaction', type: 'input', enabled: true },
    { id: 'toxicity-filter', type: 'output', enabled: true },
  ],
});

const result = await chain.execute(userInput);
```

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Development Plan](./DEV_PLAN.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [API Reference](./docs/api-reference.md)

````

### 3. Architecture Documentation

Document the system architecture in ARCHITECTURE.md:

- System overview
- Core components and their responsibilities
- Data flow diagrams
- Design patterns and principles
- Extension points

### 4. Configuration Documentation

Document all configuration options:

```markdown
## Configuration

### Budget Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxLatencyMs` | number | 1000 | Maximum total latency budget in milliseconds |
| `maxTokens` | number | 4000 | Maximum token budget |
| `skipSlowGuardrailsUnderPressure` | boolean | true | Skip slow guardrails when budget is tight |

### Guardrail Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | string | required | Unique identifier for the guardrail |
| `type` | 'input' \| 'output' | required | Type of guardrail |
| `enabled` | boolean | true | Whether the guardrail is enabled |
| `timeout` | number | 5000 | Timeout in milliseconds |
| `shortCircuitOnFail` | boolean | true | Stop chain execution on failure |
| `config` | object | {} | Guardrail-specific configuration |

### Example Configuration

```yaml
budget:
  maxLatencyMs: 1000
  maxTokens: 4000
  skipSlowGuardrailsUnderPressure: true

guardrails:
  - id: pii-redaction
    type: input
    enabled: true
    timeout: 5000
    shortCircuitOnFail: false
    config:
      redactionStrategy: "mask"
      customPatterns: []
````

````

### 5. Example Documentation

Provide comprehensive examples in the `examples/` directory:

```typescript
// examples/basic-usage.ts
/**
 * Basic Guardrail Chain Usage Example
 *
 * This example demonstrates how to create and use a simple guardrail chain
 * with built-in guardrails for PII redaction and toxicity filtering.
 */

import { GuardrailChain } from '../src/core/chain.js';
import { PIIRedaction } from '../src/guardrails/input/pii-redaction.js';
import { ToxicityFilter } from '../src/guardrails/output/toxicity-filter.js';

async function main() {
  // Create a chain with built-in guardrails
  const chain = new GuardrailChain({
    budget: {
      maxLatencyMs: 2000,
      maxTokens: 8000
    }
  });

  // Add guardrails
  chain.addGuardrail(new PIIRedaction());
  chain.addGuardrail(new ToxicityFilter({ threshold: 0.7 }));

  // Execute the chain
  const userInput = 'My email is john@example.com and I love this product!';
  const result = await chain.execute(userInput);

  console.log('Chain Result:', result);

  if (result.passed) {
    console.log('✅ Input approved');
    console.log('Transformed input:', result.transformedInput);
  } else {
    console.log('❌ Input rejected');
    console.log('Failed at guardrail:', result.failedGuardrail);
  }
}

main().catch(console.error);
````

## Documentation Standards

### Writing Style

1. **Use active voice**: "The chain executes guardrails" not "Guardrails are executed by the chain"
2. **Be concise**: Get to the point quickly
3. **Use consistent terminology**: Stick to established terms (guardrail, chain, budget, etc.)
4. **Include examples**: Show, don't just tell
5. **Use proper formatting**: Code blocks, tables, lists for readability

### Code Examples

- **Complete**: Include all necessary imports and setup
- **Runnable**: Examples should work as-is (or with minimal modification)
- **Annotated**: Add comments explaining key parts
- **Realistic**: Use realistic input values and scenarios

```typescript
// ✅ Good - complete and annotated
import { GuardrailChain } from 'guardrail-chain';

// Create chain with budget constraints
const chain = new GuardrailChain({
  budget: { maxLatencyMs: 1000 },
});

// Add PII redaction guardrail
chain.addGuardrail(
  new PIIRedaction({
    redactionStrategy: 'mask', // Replace with [TYPE]
  }),
);

// Execute with user input
const result = await chain.execute('My SSN is 123-45-6789');

// Result: { passed: true, output: 'My SSN is [SSN]' }
```

```typescript
// ❌ Bad - incomplete and unclear
const chain = new GuardrailChain();
chain.addGuardrail(new PIIRedaction());
const result = chain.execute(input);
```

### Documentation Comments

Use appropriate comment types:

```typescript
/**
 * JSDoc for public APIs
 */
export function publicApi() {}

// Single line comment for brief explanations
const MAX_RETRIES = 3;

/*
 * Multi-line comment for complex logic
 * that requires detailed explanation
 */
function complexLogic() {}

// TODO: Add rate limiting
// FIXME: Handle edge case with empty input
// NOTE: This is a performance optimization
```

## Updating Documentation

### When to Update Documentation

Update documentation when:

1. **Adding new features**: Document the new functionality
2. **Changing APIs**: Update JSDoc and examples
3. **Fixing bugs**: Document any behavior changes
4. **Improving performance**: Document new capabilities or limitations
5. **Deprecating features**: Mark as deprecated with migration path

### Documentation Review Process

1. **Self-review**: Check for clarity, accuracy, and completeness
2. **Peer review**: Have another developer review the documentation
3. **Testing examples**: Verify all code examples work
4. **Link checking**: Ensure all links are valid
5. **Final approval**: Get approval from maintainers

### Documentation Checklist

Before marking documentation as complete:

- [ ] All public APIs have JSDoc comments
- [ ] Code examples are complete and runnable
- [ ] Configuration options are documented
- [ ] Breaking changes are clearly marked
- [ ] Migration guides are provided for breaking changes
- [ ] Links are valid and point to correct locations
- [ ] Spelling and grammar are correct
- [ ] Formatting is consistent with project standards
- [ ] Examples cover common use cases
- [ ] Edge cases and limitations are documented

## Documentation Structure

### Project Documentation

```
docs/
├── api-reference.md          # Complete API documentation
├── architecture.md           # System architecture
├── configuration.md          # Configuration guide
├── examples.md               # Usage examples
├── migration-guides/
│   ├── v1-to-v2.md          # Migration from v1 to v2
│   └── custom-guardrails.md  # Guide for custom guardrails
├── best-practices.md         # Best practices guide
├── troubleshooting.md        # Common issues and solutions
└── faq.md                    # Frequently asked questions
```

### Inline Documentation

```
src/
├── core/
│   ├── chain.ts             # JSDoc for all public methods
│   ├── types.ts             # Type documentation
│   └── budget.ts            # Budget management documentation
├── guardrails/
│   ├── input/
│   │   ├── pii-redaction.ts # Guardrail-specific documentation
│   │   └── prompt-injection.ts
│   └── output/
│       ├── toxicity-filter.ts
│       └── hallucination-check.ts
└── utils/
    └── helpers.ts           # Utility function documentation
```

## Tools and Automation

### Documentation Generation

Use TypeDoc to generate API documentation:

```json
{
  "scripts": {
    "docs:generate": "typedoc --out docs/api --entryPointStrategy expand src"
  }
}
```

### Documentation Testing

Test code examples automatically:

```typescript
// scripts/test-examples.ts
import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';

const exampleFiles = readdirSync('examples').filter((f) => f.endsWith('.ts'));

for (const file of exampleFiles) {
  try {
    execSync(`npx tsx examples/${file}`, { stdio: 'inherit' });
    console.log(`✅ ${file} passed`);
  } catch (error) {
    console.error(`❌ ${file} failed`);
    process.exit(1);
  }
}
```

### Documentation Linting

Use markdownlint for consistent markdown formatting:

```json
{
  "markdownlint": {
    "default": true,
    "line-length": false,
    "single-title": false,
    "ul-indent": {
      "indent": 2
    }
  }
}
```

## Best Practices

### 1. Write for Your Audience

- **Beginners**: Provide step-by-step guides with explanations
- **Experienced developers**: Focus on API reference and advanced topics
- **Contributors**: Include development setup and contribution guidelines

### 2. Keep Documentation Close to Code

- JSDoc comments in source files
- README files in each directory
- Inline comments for complex logic

### 3. Use Version Control for Documentation

- Commit documentation changes with code changes
- Use meaningful commit messages
- Review documentation in pull requests

### 4. Maintain a Changelog

```markdown
# Changelog

## [1.2.0] - 2026-04-22

### Added

- New `SentimentAnalysis` guardrail for output filtering
- Budget tracking metrics in execution results
- Support for parallel guardrail execution

### Changed

- Updated TypeScript to v5.3
- Improved error messages for configuration validation

### Fixed

- Memory leak in caching layer
- Incorrect timeout handling in external API guardrails

### Deprecated

- `executeSync()` method - use `execute()` instead

### Security

- Updated dependencies to address security vulnerabilities
```

### 5. Provide Multiple Learning Paths

- **Quick start**: Get started in 5 minutes
- **Tutorial**: Step-by-step learning path
- **Reference**: Complete API documentation
- **Examples**: Real-world usage patterns
- **FAQ**: Common questions and answers

## Related Skills

- [Code Review Standards](code-review.md) — Documentation review checklist
- [TypeScript Best Practices](typescript-dev.md) — JSDoc and type documentation
- [Testing Strategies](testing.md) — Documenting test examples
- [Developing Guardrails](guardrail-dev.md) — Guardrail-specific documentation

## Resources

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Markdown Guide](https://www.markdownguide.org/)
- [Documentation Best Practices](https://documentation.divio.com/)
- [Keep a Changelog](https://keepachangelog.com/)

---

_Last updated: 2026-04-22_
