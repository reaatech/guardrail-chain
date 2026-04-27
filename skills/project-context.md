# Skill: Project Context & Architecture

This skill provides understanding of the Guardrail Chain project structure, architecture, and key concepts.

## Project Overview

**Guardrail Chain** is a modular, budget-aware pipeline framework for composing input/output guardrails in AI/LLM applications. It prioritizes performance, extensibility, and production readiness.

### Core Value Proposition

- **Composable Pipeline**: Chain multiple guardrails with configurable short-circuit logic
- **Budget-Aware**: Respect latency and token budgets, skip slow guardrails under time pressure
- **Production-Ready**: Enterprise-grade TypeScript with comprehensive error handling
- **Extensible**: Clear interface for custom guardrails alongside built-in implementations

## Project Structure

```
guardrail-chain/
├── src/
│   ├── core/              # Core chain engine
│   │   ├── chain.ts       # Main GuardrailChain class
│   │   ├── types.ts       # Core type definitions
│   │   ├── context.ts     # ChainContext implementation
│   │   └── budget.ts      # BudgetManager implementation
│   ├── guardrails/        # Built-in guardrails
│   │   ├── input/         # Input guardrails
│   │   │   ├── pii-redaction.ts
│   │   │   ├── prompt-injection.ts
│   │   │   ├── topic-boundary.ts
│   │   │   └── cost-precheck.ts
│   │   └── output/        # Output guardrails
│   │       ├── pii-scan.ts
│   │       ├── hallucination-check.ts
│   │       └── toxicity-filter.ts
│   ├── config/            # Configuration system
│   │   ├── loader.ts
│   │   ├── validator.ts
│   │   └── types.ts
│   ├── observability/     # Logging, metrics, tracing
│   │   ├── logger.ts
│   │   ├── metrics.ts
│   │   └── tracing.ts
│   └── utils/             # Utilities and helpers
│       ├── errors.ts
│       └── helpers.ts
├── tests/                 # Test files
├── examples/              # Usage examples
├── docs/                  # Documentation
└── scripts/               # Build and utility scripts
```

## Core Concepts

### 1. Guardrail Interface

The fundamental building block - each guardrail is an independent unit that processes input/output.

```typescript
interface Guardrail<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  type: 'input' | 'output';
  enabled: boolean;
  timeout?: number;

  execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>>;
  validateConfig?(config: unknown): boolean;
}
```

### 2. Chain Context

State passed between guardrails during execution:

```typescript
interface ChainContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  budget: BudgetState;
  metadata: Record<string, unknown>;
  transformedInput: unknown;
  originalInput: unknown;
}
```

### 3. Budget Management

Tracks and enforces latency and token budgets:

```typescript
interface BudgetState {
  remainingLatency: number;
  remainingTokens: number;
  usedLatency: number;
  usedTokens: number;
}
```

### 4. Execution Flow

1. **Input Phase**: Execute input guardrails with short-circuit logic
2. **LLM Call**: Pass transformed input to language model
3. **Output Phase**: Execute output guardrails on LLM response
4. **Final Result**: Return filtered/transformed output with metrics

## Key Design Principles

1. **Composability**: Each guardrail is independent and testable
2. **Short-Circuit Logic**: Fail fast to minimize latency
3. **Budget Awareness**: Respect latency and token constraints
4. **Type Safety**: Full TypeScript support with strict typing
5. **Observability**: Comprehensive logging, metrics, and tracing
6. **Zero Configuration**: Sensible defaults with optional customization

## Built-in Guardrails

### Input Guardrails

| Guardrail        | Purpose                                               | Performance |
| ---------------- | ----------------------------------------------------- | ----------- |
| PII Redaction    | Detect and redact personally identifiable information | ~20-50ms    |
| Prompt Injection | Identify injection patterns and jailbreak attempts    | ~10-30ms    |
| Topic Boundary   | Ensure input stays within allowed topics              | ~15-40ms    |
| Cost Precheck    | Estimate and validate token/cost budgets              | ~5-10ms     |

### Output Guardrails

| Guardrail           | Purpose                                 | Performance |
| ------------------- | --------------------------------------- | ----------- |
| PII Scan            | Detect PII in LLM responses             | ~20-50ms    |
| Hallucination Check | Flag potential factual inconsistencies  | ~100-200ms  |
| Toxicity Filter     | Detect harmful or inappropriate content | ~30-80ms    |

## Configuration System

Supports multiple configuration approaches:

- **YAML/JSON files**: For static configuration
- **Environment variables**: For runtime overrides
- **Programmatic setup**: For dynamic configuration

Example configuration:

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
      redactionStrategy: 'mask'

  - id: toxicity-filter
    type: output
    enabled: true
    timeout: 3000
    shortCircuitOnFail: true
    config:
      threshold: 0.7
```

## Observability Features

### Structured Logging

- Correlation IDs for request tracking
- Performance metrics per guardrail
- Error tracking with context

### Metrics (Prometheus Format)

- `guardrail_executions_total{guardrail_id, result}`
- `guardrail_execution_duration_seconds{guardrail_id}`
- `budget_remaining_latency_seconds`
- `chain_execution_duration_seconds`

### Distributed Tracing

- OpenTelemetry support
- Span per guardrail execution
- Context propagation

## Performance Considerations

### Latency Budgets

- Typical chain: < 100ms for 3 guardrails (excluding external API calls)
- Individual guardrail overhead: < 10ms
- Total budget: Configurable, default 1000ms

### Optimization Strategies

1. **Caching**: Cache results of expensive guardrails
2. **Parallel Execution**: Execute independent guardrails concurrently
3. **Lazy Loading**: Load guardrail modules on demand
4. **Short-Circuit**: Stop execution on first failure when configured

## Error Handling

### Error Types

```typescript
enum GuardrailErrorType {
  TIMEOUT = 'TIMEOUT',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}
```

### Recovery Strategies

- **Timeout**: Retry with exponential backoff (max 3 attempts)
- **Budget Exceeded**: Skip remaining non-critical guardrails
- **Validation Failed**: Use default configuration or fail fast
- **Execution Failed**: Log error and continue if recoverable

## Testing Strategy

### Coverage Targets

- Line coverage: >95%
- Branch coverage: >90%
- Critical paths: 100%

### Test Types

1. **Unit Tests**: Test each guardrail in isolation
2. **Integration Tests**: Test complete chain execution
3. **Performance Tests**: Benchmark under load
4. **Security Tests**: Test for vulnerabilities

## Development Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck

# Build
pnpm build
```

## Quality Gates

- **Test Coverage**: >95% line, >90% branch
- **Type Safety**: Strict mode, no `any` types, prefer `unknown`
- **Performance**: Guardrail overhead < 10ms
- **Bundle Size**: Core < 50KB gzipped
- **Security**: No known vulnerabilities

## Key Files to Understand

1. `src/core/types.ts` - Core type definitions
2. `src/core/chain.ts` - Main chain engine
3. `src/guardrails/input/pii-redaction.ts` - Example input guardrail
4. `src/guardrails/output/toxicity-filter.ts` - Example output guardrail
5. `src/config/loader.ts` - Configuration system

## Common Patterns

### Creating a New Guardrail

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '../core/types.js';

export class MyGuardrail implements Guardrail<string, string> {
  readonly id = 'my-guardrail';
  readonly name = 'My Guardrail';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 5000;

  constructor(private config: MyConfig = {}) {}

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      // Implementation
      return { passed: true, output: input, metadata: { duration: Date.now() - startTime } };
    } catch (error) {
      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
```

### Using the Chain

```typescript
import { GuardrailChain } from './core/chain.js';

const chain = new GuardrailChain({
  budget: { maxLatencyMs: 1000, maxTokens: 4000 },
  guardrails: [
    { id: 'pii-redaction', type: 'input', enabled: true },
    { id: 'toxicity-filter', type: 'output', enabled: true },
  ],
});

const result = await chain.execute(userInput);
```

## Module System

This project is **ESM-only**. All source files use `.ts` extension and are compiled to ESM. Import paths in examples must include the `.js` extension (Node.js ESM requirement):

```typescript
// ✅ Correct ESM import
import { GuardrailChain } from '../core/chain.js';

// ❌ Incorrect — missing extension or using require
import { GuardrailChain } from '../core/chain';
```

## Related Skills

- [TypeScript Best Practices](typescript-dev.md) — ESM import rules and strict typing
- [Developing Guardrails](guardrail-dev.md) — Creating new guardrails
- [Testing Strategies](testing.md) — Test organization and coverage targets
- [Performance Guidelines](performance.md) — Latency budgets and optimization

## Resources

- **Architecture Documentation**: ARCHITECTURE.md
- **Development Plan**: DEV_PLAN.md
- **Contributing Guide**: CONTRIBUTING.md
- **Examples**: examples/ directory

---

_Last updated: 2026-04-22_
