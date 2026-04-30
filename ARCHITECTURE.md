# Architecture: Guardrail Chain

## System Overview

Guardrail Chain is a **pnpm monorepo** providing a composable, budget-aware input/output guardrail pipeline framework for AI/LLM applications. The architecture prioritizes performance, extensibility, and production readiness with a modular package structure under the `@reaatech` scope.

## Core Design Principles

1. **Composability** — Each guardrail is an independent, testable unit implementing the `Guardrail<TInput, TOutput>` interface
2. **Short-Circuit Logic** — Fail fast on blocking guardrail failures to minimize latency
3. **Budget Awareness** — Respect latency and token constraints; skip non-essential guardrails under pressure
4. **Type Safety** — Full TypeScript support with strict typing; no `any` in the public API
5. **Observability** — Pluggable logging, metrics, and tracing interfaces (no-op by default)
6. **Zero-Friction Configuration** — Sensible defaults with optional file-based and env-based configuration

## Monorepo Structure

```
guardrail-chain/
├── packages/
│   ├── guardrail-chain/       → @reaatech/guardrail-chain
│   │   └── src/               core types, chain, builder, budget, context,
│   │                          errors, helpers, retry, circuit-breaker, cache
│   ├── guardrails/            → @reaatech/guardrail-chain-guardrails
│   │   └── src/               13 guardrail implementations + CachedGuardrail wrapper
│   ├── observability/         → @reaatech/guardrail-chain-observability
│   │   └── src/               Logger, MetricsCollector, Tracer/Span interfaces
│   └── config/                → @reaatech/guardrail-chain-config
│       └── src/               loader (JSON/YAML/env), Zod validator
├── examples/basic-usage/      private example package
├── pnpm-workspace.yaml
├── turbo.json                 build orchestration
├── biome.json                 formatting + linting
├── .changeset/                versioning + changelogs
└── tsconfig.json              base config extended by all packages
```

### Dependency Graph

```
@reaatech/guardrail-chain-observability  (no internal deps)
         ↑
@reaatech/guardrail-chain  (depends on observability)
         ↑              ↑
guardrails          config
```

### Package Design Rationale

- **`guardrail-chain`** — The foundation. Holds the `Guardrail` interface and all core orchestration. Every other package depends on it.
- **`guardrail-chain-observability`** — Zero internal dependencies. Standalone interfaces that `guardrail-chain` consumes. Consumers swap implementations via `setLogger()`/`setMetrics()`/`setTracer()`.
- **`guardrail-chain-guardrails`** — All built-in guardrails live here. Depends only on `guardrail-chain` for the `Guardrail` interface, types, and utilities.
- **`guardrail-chain-config`** — Configuration loading and validation. Depends on `guardrail-chain` for types and `guardrail-chain-observability` for logging.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  (Express Middleware, Next.js API Route, Direct SDK Usage)     │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                       Chain Engine                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            GuardrailChain (Orchestrator)                  │  │
│  │  • Sequential Execution with budget-aware scheduling      │  │
│  │  • Short-Circuit Logic (per-guardrail configurable)       │  │
│  │  • Budget Enforcement (latency + token)                   │  │
│  │  • Error Handling with retry + timeout                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Input Phase    │ │   LLM Call      │ │ Output Phase    │
│  Guardrails     │ │  (your code)    │ │  Guardrails     │
│                 │ │                 │ │                 │
│ • PII Redaction │ │                 │ │ • PII Scan      │
│ • Injection     │ │                 │ │ • Hallucination │
│ • Topic Check   │ │                 │ │ • Toxicity      │
│ • Cost Precheck │ │                 │ │ • Sentiment     │
│ • Rate Limiter  │ │                 │ │                 │
│ • Language Det. │ │                 │ │                 │
│ • Moderation    │ │                 │ │                 │
│ • Memory Limit  │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                   Cross-Cutting Concerns                        │
│  ┌────────────┐ ┌──────────────┐ ┌─────────────┐              │
│  │   Config   │ │ Observability│ │   Budget    │              │
│  │   System   │ │   System     │ │  Manager    │              │
│  └────────────┘ └──────────────┘ └─────────────┘              │
└────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Guardrail Interface

The fundamental building block. Every guardrail must implement this interface.

```typescript
interface Guardrail<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly type: 'input' | 'output';
  enabled: boolean;
  timeout?: number;
  essential?: boolean;
  priority?: number;
  estimatedCostMs?: number;
  shortCircuitOnFail?: boolean;

  execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>>;
  validateConfig?(config: unknown): boolean;
}
```

**Key fields:**

| Field | Purpose |
|-------|---------|
| `priority` | Lower = earlier execution. Used for budget-aware scheduling. Default: `50`. |
| `estimatedCostMs` | Rough latency estimate. BudgetManager uses this to decide whether to skip. Default: `50`. |
| `essential` | If `true`, the guardrail always runs even when the budget is exceeded. Default: `false`. |
| `shortCircuitOnFail` | If `true` (default), a failed guardrail halts the phase immediately. Set `false` to continue past failures. |

### 2. GuardrailResult

```typescript
interface GuardrailResult<TOutput = unknown> {
  passed: boolean;
  output?: TOutput;
  confidence?: number;
  metadata?: {
    duration: number;
    tokensUsed?: number;
    [key: string]: unknown;
  };
  error?: Error;
}
```

### 3. ChainContext

State threaded through every guardrail execution:

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

### 4. Chain Engine (`GuardrailChain`)

The orchestrator in `packages/guardrail-chain/src/chain.ts`. Responsibilities:

1. **Input Phase** — executes input guardrails sequentially, transforming input at each step
2. **Output Phase** — executes output guardrails on the (post-LLM) output
3. **Budget Enforcement** — uses `BudgetManager` to track and enforce latency/token budgets
4. **Timeout Handling** — each guardrail runs with a timeout; times out → error result
5. **Retry Support** — when configured, transient failures are retried with exponential backoff
6. **Short-Circuit Logic** — if a guardrail fails and `shortCircuitOnFail` is `true`, the phase halts immediately

```typescript
class GuardrailChain {
  addGuardrail(guardrail: Guardrail): this;
  execute(input: unknown, options?: ExecutionOptions): Promise<ChainResult>;
  executeInput(input: unknown, options?: ExecutionOptions): Promise<ChainResult>;
  executeOutput(output: unknown, context: ChainContext): Promise<ChainResult>;
}
```

### 5. Budget Manager

Tracks latency and token budgets. Sourced from `packages/guardrail-chain/src/budget.ts`.

```typescript
class BudgetManager {
  canExecute(estimatedCostMs: number): boolean;
  recordExecution(duration: number, tokens?: number): void;
  getRemainingBudget(): BudgetState;
  isExceeded(): boolean;
}
```

**Budget-aware scheduling algorithm:**

1. Filter out disabled guardrails
2. Sort by priority (lower = earlier), then by estimated cost (cheaper first)
3. Select guardrails that fit within remaining budget — skip non-essential ones that don't
4. Essential guardrails always run regardless of budget

### 6. Fluent Builder (`ChainBuilder`)

```typescript
class ChainBuilder {
  withBudget(budget: BudgetConfig): this;
  withGuardrail(guardrail: Guardrail): this;
  withGuardrails(guardrails: Guardrail[]): this;
  withErrorHandling(config: ErrorHandlingConfig): this;
  withObservability(config: ObservabilityConfig): this;
  withSlowGuardrailSkipping(enabled: boolean): this;
  build(): GuardrailChain;
}
```

### 7. Configuration System

In `packages/config/`. Loads chain configuration from files (`.json`, `.yaml`, `.yml`) and environment variables (`GUARDRAIL_CHAIN_*`), validates via Zod, and deep-merges the results.

```typescript
import { loadConfig } from '@reaatech/guardrail-chain-config';

const config = await loadConfig({
  filePath: './guardrail.config.yaml',
  useEnv: true,
  envPrefix: 'GUARDRAIL_CHAIN',
});
```

### 8. Module Design & Public API

Every package ships **dual ESM/CJS output** (built with `tsup --format cjs,esm --dts`). Consumers import from the package they need:

```typescript
// Core framework
import { GuardrailChain, ChainBuilder, BudgetManager } from '@reaatech/guardrail-chain';
import type { Guardrail, ChainContext } from '@reaatech/guardrail-chain';

// Built-in guardrails
import { PIIRedaction, PromptInjection, ToxicityFilter } from '@reaatech/guardrail-chain-guardrails';

// Observability
import { setLogger, ConsoleLogger } from '@reaatech/guardrail-chain-observability';

// Configuration
import { loadConfig } from '@reaatech/guardrail-chain-config';
```

The `@reaatech/guardrail-chain` package re-exports observability getter/setter functions for single-import convenience.

## Built-in Guardrails

All guardrails live in `packages/guardrails/src/` and use **regex-based** detection — no external API calls, no ML models, deterministic behavior.

### Input Guardrails (8)

| Guardrail | ID | Detection Method |
|-----------|----|-----------------|
| `PIIRedaction` | `pii-redaction` | Regex patterns for emails, phones, SSNs, credit cards + Luhn algorithm check |
| `PromptInjection` | `prompt-injection` | Regex patterns for jailbreak prompts, "ignore previous instructions", role-reversal |
| `TopicBoundary` | `topic-boundary` | Keyword allowlist/blocklist matching against topic domains |
| `CostPrecheck` | `cost-precheck` | Heuristic token estimation (~4 chars per token) and budget validation |
| `RateLimiter` | `rate-limiter` | Sliding-window counter keyed by userId/sessionId |
| `LanguageDetector` | `language-detector` | Keyword fingerprint matching for en/es/fr/de/zh/ja |
| `ContentModeration` | `content-moderation` | Configurable regex rule engine with category tagging |
| `MemoryLimit` | `memory-limit` | `process.memoryUsage().heapUsed` check against configured limit |

### Output Guardrails (4)

| Guardrail | ID | Detection Method |
|-----------|----|-----------------|
| `PIIScan` | `pii-scan` | Same regex logic as `PIIRedaction`, applied to LLM outputs |
| `HallucinationCheck` | `hallucination-check` | Heuristic pattern matching for speculative language ("I think", "probably", etc.) + optional external verifier callback |
| `ToxicityFilter` | `toxicity-filter` | Regex patterns for insults, violence, hate speech, profanity per category |
| `SentimentAnalysis` | `sentiment-analysis` | Positive/negative word-count scoring with configurable threshold |

### Wrappers (1)

| Wrapper | Purpose |
|---------|---------|
| `CachedGuardrail` | Wraps any guardrail with an LRU cache (TTL-based, keyed by input hash + config fingerprint) |

## Execution Flow

### Complete Chain Execution

```
1. Create chain context with correlation ID and budget state
2. Execute input guardrails sequentially:
   a. Sort by priority, then estimated cost
   b. Skip non-essential guardrails that exceed remaining budget
   c. Run each with timeout; retry on transient failures
   d. Short-circuit on failure unless shortCircuitOnFail is false
   e. Transform input at each step (output of G(N) becomes input to G(N+1))
3. ── YOUR LLM CALL GOES HERE ──
4. Execute output guardrails on the LLM response:
   a. Same budget/scheduling/short-circuit logic as input phase
5. Return ChainResult with success/failure, output, metadata, and diagnostics
```

### Short-Circuit Logic

- Default: `shortCircuitOnFail = true` — a failed guardrail stops the phase immediately
- Override: set `shortCircuitOnFail = false` to collect all guardrail results even on failure
- Skipped guardrails (budget exceeded) report `passed: true, metadata: { skipped: true }`

### Budget-Aware Scheduling

1. **Essential guardrails** always run regardless of budget
2. **Non-essential guardrails** are skipped when `estimatedCostMs > remainingLatency`
3. Guardrails sort by **priority** (lower = earlier), then **estimated cost** (cheaper first)
4. Runtime budget is rechecked — estimates may be wrong, the `canExecute()` check prevents overrun

## Observability

All observability defaults to **no-op implementations**. Consumers install adapters via setter functions. Defined in `packages/observability/`.

### Logger

```typescript
import { setLogger, ConsoleLogger } from '@reaatech/guardrail-chain-observability';
setLogger(new ConsoleLogger());
```

Every guardrail execution produces structured log entries with `correlationId`, `guardrailId`, duration, and pass/fail status.

### Metrics

```typescript
import { setMetrics } from '@reaatech/guardrail-chain-observability';
setMetrics(myPrometheusCollector);
```

Built-in metrics:
- `guardrail.executed` (counter, labels: `guardrail_id`, `result`)
- `guardrail.duration` (histogram, labels: `guardrail_id`, `guardrail_type`)
- `guardrail.skipped` (counter, labels: `guardrail_id`, `reason`)
- `chain.duration` / `chain.input.duration` / `chain.output.duration` (histograms)
- `chain.success` / `chain.input.failed` / `chain.output.failed` (counters)

### Tracing

```typescript
import { setTracer } from '@reaatech/guardrail-chain-observability';
setTracer(myOpenTelemetryTracer);
```

Each chain execution creates an `execute_chain` span with `correlation_id` attribute.

## Error Handling

### Error Classes

| Class | Code | Recoverable | When |
|-------|------|-------------|------|
| `GuardrailError` | — | varies | Base class — carries `type`, `guardrailId`, and `recoverable` flag |
| `TimeoutError` | `TIMEOUT` | yes | Guardrail exceeded its timeout |
| `BudgetExceededError` | `BUDGET_EXCEEDED` | yes | Latency or token budget exceeded |
| `ValidationError` | `VALIDATION_FAILED` | no | Configuration or input validation failed |

### Recovery Strategies

- **Timeout**: retry via `withRetry()` with exponential backoff + jitter (configurable max retries, initial delay, cap)
- **Budget exceeded**: skip remaining non-critical guardrails; essential guardrails still run
- **Validation failed**: fail fast with descriptive error message
- **Execution failed**: log error; if guardrail is configured `shortCircuitOnFail`, halt the phase

## Utility Classes

Located in `packages/guardrail-chain/src/`. These are opt-in; the chain does not apply them automatically.

| Utility | Purpose |
|---------|---------|
| `CircuitBreaker` | CLOSED/OPEN/HALF_OPEN state machine — prevents cascading failures for external-service guardrails |
| `LRUCache<K, V>` | TTL-aware LRU cache — configurable max size and expiry |
| `withRetry<T>()` | Execute async function with exponential backoff, jitter, and configurable retry predicate |

## Testing Strategy

### Test Organization

Tests are **co-located** next to source files as `*.test.ts`. Each package runs its own test suite via Vitest.

```
packages/guardrail-chain/src/
├── types.ts
├── chain.ts
├── chain.test.ts         ← co-located
├── builder.ts
├── builder.test.ts       ← co-located
└── ...
```

### Test Categories

- **Unit tests** — each guardrail, each utility class, each function tested in isolation
- **Integration tests** — `chain-integration.test.ts` verifies full chain execution with multiple guardrails, budget enforcement, short-circuit logic, and correlation ID propagation
- **Coverage** — 95% thresholds for lines, functions, and statements; 90% for branches (configured per-package in `vitest.config.ts`)

### Running Tests

```bash
pnpm test            # turbo orchestrates all packages
pnpm test:coverage   # with coverage reports
```

## Build & Tooling

| Tool | Config | Purpose |
|------|--------|---------|
| **tsup** | Per-package (in `scripts.build`) | Builds dual ESM/CJS output + `.d.ts` declarations into `dist/` |
| **Turborepo** | `turbo.json` | Orchestrates builds in dependency order, caches outputs |
| **Biome** | `biome.json` | Linting + formatting (replaces Prettier + ESLint) |
| **Vitest** | Per-package `vitest.config.ts` | Test runner, coverage (v8 provider) |
| **Changesets** | `.changeset/config.json` | Versioning + changelog generation; `changesets/action@v1` in CI |

### Build Output

Each package produces:
```
dist/
├── index.js        (ESM)
├── index.cjs       (CJS)
├── index.d.ts      (TypeScript declarations)
└── index.d.cts     (CJS-compatible declarations)
```

## Extension Points

### Custom Guardrails

Implement the `Guardrail<TInput, TOutput>` interface from `@reaatech/guardrail-chain`:

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '@reaatech/guardrail-chain';

class CustomModeration implements Guardrail<string, string> {
  readonly id = 'custom-moderation';
  readonly name = 'Custom Moderation';
  readonly type = 'output' as const;
  enabled = true;
  timeout = 5000;

  constructor(private readonly blocklist: string[]) {}

  async execute(input: string, _context: ChainContext): Promise<GuardrailResult<string>> {
    const start = Date.now();
    const flagged = this.blocklist.some((word) => input.toLowerCase().includes(word));

    return {
      passed: !flagged,
      output: input,
      metadata: { duration: Date.now() - start },
    };
  }
}
```

### Custom Observability Adapters

Implement the `Logger`, `MetricsCollector`, or `Tracer`/`Span` interfaces from `@reaatech/guardrail-chain-observability` and install them via the setter functions.

### Custom Configuration Sources

Implement the `loadConfigFromFile` / `loadConfigFromEnv` pattern to add new configuration sources. Use `validateConfig()` or `validateConfigSafe()` from `@reaatech/guardrail-chain-config` for Zod validation.

---

_This document reflects the architecture as of 2026-04-30._
