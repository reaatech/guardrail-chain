# @reaatech/guardrail-chain

[![npm version](https://img.shields.io/npm/v/@reaatech/guardrail-chain.svg)](https://www.npmjs.com/package/@reaatech/guardrail-chain)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/guardrail-chain/ci.yml?branch=main&label=CI)](https://github.com/reaatech/guardrail-chain/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Core types, chain orchestration, budget management, and utilities for the Guardrail Chain framework. This package is the foundation for all `@reaatech/guardrail-chain-*` packages and provides the `Guardrail` interface that every guardrail implementation must satisfy.

## Installation

```bash
npm install @reaatech/guardrail-chain
# or
pnpm add @reaatech/guardrail-chain
```

## Feature Overview

- **Composable guardrail pipeline** — chain input and output guardrails with budget-aware scheduling, priority ordering, and short-circuit-on-failure logic.
- **Budget management** — track latency and token budgets, skip non-essential guardrails under pressure, and prevent budget overruns.
- **Fluent builder API** — construct chains declaratively with `ChainBuilder`, or wire them programmatically with `GuardrailChain`.
- **Retry with exponential backoff** — transparent retry for transient failures, with configurable predicates, jitter, and caps.
- **Circuit breaker** — protect external-service guardrails from cascading failures with CLOSED/OPEN/HALF_OPEN state tracking.
- **LRU cache** — TTL-aware cache for guardrail results, with configurable eviction policy.
- **Exported observability getter/setter functions** — `setLogger`, `setMetrics`, `setTracer` re-exported from `@reaatech/guardrail-chain-observability` for single-import convenience.
- **Zero runtime dependencies** beyond `@reaatech/guardrail-chain-observability` — lightweight and tree-shakeable.
- **Dual ESM/CJS output** — works with `import` and `require`.

## Quick Start

```typescript
import {
  GuardrailChain,
  ChainBuilder,
  setLogger,
  ConsoleLogger,
  type Guardrail,
  type GuardrailResult,
  type ChainContext,
} from '@reaatech/guardrail-chain';

setLogger(new ConsoleLogger());

const chain = new ChainBuilder()
  .withBudget({ maxLatencyMs: 500, maxTokens: 4000 })
  .build();

const result = await chain.execute('What is the weather today?');
console.log(result.success ? 'Passed' : 'Failed');
```

## Exports

### Core Classes

| Export | Description |
|--------|-------------|
| `GuardrailChain` | Main orchestrator — executes input and output guardrail phases with budget-aware scheduling, timeout handling, retry, and short-circuit logic. |
| `ChainBuilder` | Fluent builder for constructing `GuardrailChain` instances with a declarative chaining API. |
| `BudgetManager` | Tracks and enforces latency and token budgets throughout chain execution. |

### Core Types

| Export | Description |
|--------|-------------|
| `Guardrail<TInput, TOutput>` | The fundamental guardrail interface — every guardrail must implement `id`, `name`, `type`, `enabled`, `execute()`, and optional metadata fields. |
| `GuardrailResult<TOutput>` | Result of a single guardrail execution — `passed`, optional `output`, `confidence`, `metadata`, `error`. |
| `ChainContext` | State passed between guardrails — `correlationId`, `userId`, `sessionId`, `budget`, `metadata`, `transformedInput`, `originalInput`. |
| `ChainConfig` | Configuration for the chain — `budget`, `observability`, `errorHandling`. |
| `ChainResult` | Result of a complete chain execution — `success`, `output`, `error`, `failedGuardrail`, `metadata`. |
| `ChainResultMetadata` | Well-known fields on `ChainResult.metadata` — `correlationId`, `inputDuration`, `outputDuration`, `totalDuration`, `phase`. |
| `ExecutionOptions` | Per-run options — `userId`, `sessionId`, `correlationId` overrides. |
| `BudgetConfig` | Budget constraints — `maxLatencyMs`, `maxTokens`, `skipSlowGuardrailsUnderPressure`. |
| `BudgetState` | Live budget tracking — `remainingLatency`, `remainingTokens`, `usedLatency`, `usedTokens`. |
| `GuardrailConfig` | Per-guardrail configuration — `id`, `type`, `enabled`, `timeout`, `essential`, `priority`, `estimatedCostMs`, `shortCircuitOnFail`. |
| `ObservabilityConfig` | Toggles for observability subsystems. |
| `ErrorHandlingConfig` | Error handling strategy — `failOpen`, `maxRetries`, `retryDelayMs`. |

### Factory Functions

| Export | Description |
|--------|-------------|
| `createChainContext` | Factory for `ChainContext` — initializes budget state from a `BudgetConfig` and optional overrides. |

### Error Classes

| Class | Extends | Code | When |
|-------|---------|------|------|
| `GuardrailError` | `Error` | — | Base class for all guardrail errors. Carries `type`, `guardrailId`, and `recoverable` flag. |
| `TimeoutError` | `GuardrailError` | `TIMEOUT` | A guardrail exceeded its timeout. Recoverable. |
| `BudgetExceededError` | `GuardrailError` | `BUDGET_EXCEEDED` | Latency or token budget was exceeded during guardrail execution. Recoverable. |
| `ValidationError` | `GuardrailError` | `VALIDATION_FAILED` | Configuration or input validation failed. Not recoverable. |
| `GuardrailErrorType` | (enum) | — | Enum of error codes: `TIMEOUT`, `BUDGET_EXCEEDED`, `VALIDATION_FAILED`, `EXECUTION_FAILED`, `CONFIGURATION_ERROR`. |

### Utility Classes

| Export | Description |
|--------|-------------|
| `CircuitBreaker` | Circuit breaker pattern — CLOSED/OPEN/HALF_OPEN states, configurable failure/success thresholds and reset timeout. |
| `LRUCache<K, V>` | LRU cache with TTL support — `get`, `set`, `has`, `delete`, `clear`, `size` methods. |

### Utility Functions

| Export | Description |
|--------|-------------|
| `withRetry` | Execute an async function with retry logic — exponential backoff, configurable predicate, jitter, and max retries. |
| `generateCorrelationId` | Generate a v4 UUID for correlation IDs — uses `crypto.randomUUID()` when available. |
| `hashString` | 53-bit string hash using MurmurHash-inspired mixing. |

### Retry Types & Constants

| Export | Description |
|--------|-------------|
| `RetryConfig` | Configuration — `maxRetries`, `initialDelayMs`, `maxDelayMs`, `multiplier`, `jitter`. |
| `DEFAULT_RETRY_CONFIG` | Sensible defaults (`3` retries, `100ms` start, `5s` cap, `×2`, jitter enabled). |
| `RetryPredicate` | Type for retry decision function — receives `(error, attempt)` and returns `boolean`. |
| `defaultRetryPredicate` | Default predicate — retries on timeout and transient network errors. |

### Cache Types & Constants

| Export | Description |
|--------|-------------|
| `CacheConfig` | Configuration — `maxSize`, `ttlMs`. |
| `DEFAULT_CACHE_CONFIG` | Sensible defaults (`1000` entries, `1h` TTL). |
| `CacheEntry<T>` | Internal cache entry — `value`, `expiresAt`. |

### Circuit Breaker Types & Constants

| Export | Description |
|--------|-------------|
| `CircuitBreakerConfig` | Configuration — `failureThreshold`, `resetTimeoutMs`, `successThreshold`. |
| `DEFAULT_CIRCUIT_BREAKER_CONFIG` | Sensible defaults (`5` failures, `30s` reset, `2` successes to close). |

### Re-exports from observability

For convenience, the following are re-exported from `@reaatech/guardrail-chain-observability`:

| Export | Description |
|--------|-------------|
| `getLogger` / `setLogger` | Get or set the global logger instance. |
| `ConsoleLogger` | Logs to `console.debug/info/warn/error`. |
| `NoOpLogger` | Default silent logger — used when no logger is set. |
| `getMetrics` / `setMetrics` | Get or set the global metrics collector. |
| `getTracer` / `setTracer` | Get or set the global tracer instance. |
| `Logger` / `MetricsCollector` / `Tracer` / `Span` | Observability interfaces. |

## Usage Patterns

### Building a chain with the fluent builder

```typescript
import { ChainBuilder } from '@reaatech/guardrail-chain';
import { PIIRedaction, ToxicityFilter } from '@reaatech/guardrail-chain-guardrails';

const chain = new ChainBuilder()
  .withBudget({ maxLatencyMs: 500, maxTokens: 4000 })
  .withGuardrail(new PIIRedaction())
  .withGuardrail(new ToxicityFilter())
  .withSlowGuardrailSkipping(true)
  .withErrorHandling({ maxRetries: 2, retryDelayMs: 200 })
  .build();
```

### Wrapping an external-service guardrail with a circuit breaker

```typescript
import { CircuitBreaker, type Guardrail, type GuardrailResult, type ChainContext } from '@reaatech/guardrail-chain';

const breaker = new CircuitBreaker('moderation-api', {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
});

class ExternalModerationGuardrail implements Guardrail<string, string> {
  readonly id = 'external-moderation';
  readonly name = 'External Moderation';
  readonly type = 'output' as const;
  enabled = true;

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    return breaker.execute(async () => {
      const response = await fetch('https://api.example.com/moderate', {
        method: 'POST',
        body: JSON.stringify({ text: input }),
      });
      const data = await response.json();
      return { passed: data.flagged === false, output: data.sanitized ?? input };
    }).catch(() => {
      return { passed: true, output: input }; // fail-open
    });
  }
}
```

### Caching guardrail results

```typescript
import { LRUCache, generateCorrelationId } from '@reaatech/guardrail-chain';

const cache = new LRUCache<string, boolean>({ maxSize: 500, ttlMs: 300_000 });
const correlationId = generateCorrelationId();
```

## Related Packages

- [`@reaatech/guardrail-chain-guardrails`](https://www.npmjs.com/package/@reaatech/guardrail-chain-guardrails) — built-in guardrail implementations (PII, injection, toxicity, etc.)
- [`@reaatech/guardrail-chain-observability`](https://www.npmjs.com/package/@reaatech/guardrail-chain-observability) — pluggable logging, metrics, and tracing interfaces
- [`@reaatech/guardrail-chain-config`](https://www.npmjs.com/package/@reaatech/guardrail-chain-config) — configuration loader and Zod-based validator

## License

[MIT](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
