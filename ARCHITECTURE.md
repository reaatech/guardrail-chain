# Architecture: Guardrail Chain

## System Overview

Guardrail Chain is a modular, budget-aware pipeline framework for composing input/output guardrails in AI/LLM applications. The architecture prioritizes performance, extensibility, and production readiness.

## Core Design Principles

1. **Composability**: Each guardrail is an independent, testable unit
2. **Short-Circuit Logic**: Fail fast when possible to minimize latency
3. **Budget Awareness**: Respect latency and token constraints
4. **Type Safety**: Full TypeScript support with strict typing
5. **Observability**: Comprehensive logging, metrics, and tracing
6. **Zero Configuration**: Sensible defaults with optional customization

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│  (Express Middleware, Next.js API Route, Direct SDK Usage)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Chain Engine                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              GuardrailChain (Orchestrator)                │   │
│  │  • Sequential/Parallel Execution                          │   │
│  │  • Short-Circuit Logic                                    │   │
│  │  • Budget Enforcement                                     │   │
│  │  • Error Handling & Recovery                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Input Phase    │ │  Execution      │ │ Output Phase    │
│  Guardrails     │ │  (LLM Call)     │ │  Guardrails     │
│                 │ │                 │ │                 │
│ • PII Redaction │ │                 │ │ • PII Scan      │
│ • Injection     │ │                 │ │ • Hallucination │
│ • Topic Check   │ │                 │ │ • Toxicity      │
│ • Cost Precheck │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cross-Cutting Concerns                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Config    │  │ Observability│  │   Budget    │             │
│  │   System    │  │   System     │  │  Manager    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Guardrail Interface

The fundamental building block - each guardrail is a function that processes input and returns a result.

```typescript
// Core guardrail interface
interface Guardrail<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  type: 'input' | 'output';
  enabled: boolean;
  timeout?: number;

  // Main execution method
  execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>>;

  // Optional: validation method for configuration
  validateConfig?(config: unknown): boolean;
}

// Result of guardrail execution
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

// Context passed between guardrails
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

### 2. Chain Engine

The orchestrator that manages guardrail execution with budget awareness and short-circuit logic.

```typescript
class GuardrailChain {
  private inputGuardrails: Guardrail[];
  private outputGuardrails: Guardrail[];
  private config: ChainConfig;
  private budgetManager: BudgetManager;

  async execute(input: unknown, options?: ExecutionOptions): Promise<ChainResult> {
    // 1. Initialize context and budget
    // 2. Execute input guardrails with short-circuit logic
    // 3. Return transformed input for LLM
    // 4. Execute output guardrails on LLM response
    // 5. Return final result with metrics
  }

  async executeInput(input: unknown): Promise<InputResult> {
    // Execute only input guardrails
  }

  async executeOutput(output: unknown, context: ChainContext): Promise<OutputResult> {
    // Execute only output guardrails
  }
}
```

### 3. Budget Manager

Tracks and enforces latency and token budgets throughout the chain execution.

```typescript
class BudgetManager {
  private totalLatencyBudget: number;
  private totalTokenBudget: number;
  private usedLatency: number = 0;
  private usedTokens: number = 0;

  canExecute(estimatedCostMs: number): boolean {
    // Check if guardrail can be executed within remaining budget
    return this.hasRemainingBudget(estimatedCostMs);
  }

  recordExecution(duration: number, tokens?: number): void {
    this.usedLatency += duration;
    if (tokens) this.usedTokens += tokens;
  }

  getRemainingBudget(): BudgetState {
    return {
      remainingLatency: this.totalLatencyBudget - this.usedLatency,
      remainingTokens: this.totalTokenBudget - this.usedTokens,
      usedLatency: this.usedLatency,
      usedTokens: this.usedTokens,
    };
  }
}
```

### 4. Configuration System

Flexible configuration supporting YAML/JSON files, environment variables, and programmatic setup.

```typescript
interface ChainConfig {
  budget: BudgetConfig;
  guardrails: GuardrailConfig[];
  observability: ObservabilityConfig;
  errorHandling: ErrorHandlingConfig;
}

interface BudgetConfig {
  maxLatencyMs: number;
  maxTokens: number;
  skipSlowGuardrailsUnderPressure: boolean;
}

interface GuardrailConfig {
  id: string;
  type: 'input' | 'output';
  enabled: boolean;
  timeout?: number;
  config?: Record<string, unknown>;
  /** Stop chain execution on failure */
  shortCircuitOnFail: boolean;
  /** Mark as essential: cannot be skipped even under budget pressure */
  essential?: boolean;
  /** Execution priority (lower = earlier). Used for budget-aware scheduling. */
  priority?: number;
  /** Estimated latency cost in milliseconds. Used by BudgetManager. */
  estimatedCostMs?: number;
}
```

### 5. Public API & Module Design

The library is distributed as **ESM-only** (Node.js 18+) with a single bundled entry point via `tsup`.

```typescript
// Main entry — chain engine and core types
import { GuardrailChain, ChainBuilder } from 'guardrail-chain';
import type { Guardrail, GuardrailResult, ChainContext } from 'guardrail-chain';

// Guardrails subpath
import { PIIRedaction, ToxicityFilter } from 'guardrail-chain/guardrails';

// Observability subpath
import { getLogger, getMetrics } from 'guardrail-chain/observability';
```

**Key decisions:**

- **ESM-only** simplifies the build, avoids dual-package hazards, and aligns with modern tooling.
- **Subpath exports** keep bundle size down for consumers who only need guardrails or observability.
- **Top-level types** are re-exported from `guardrail-chain` so most consumers only need one import.

## Built-in Guardrails

### Input Guardrails

#### 1. PII Redaction

- **Purpose**: Detect and redact personally identifiable information
- **Implementation**: Pattern matching + NER models
- **Config**: Custom patterns, redaction strategy (mask/replace/remove)
- **Performance**: ~20-50ms for typical input

#### 2. Prompt Injection Detection

- **Purpose**: Identify common injection patterns and jailbreak attempts
- **Implementation**: Pattern matching + ML classifier
- **Config**: Sensitivity levels, custom patterns
- **Performance**: ~10-30ms

#### 3. Topic Boundary Check

- **Purpose**: Ensure input stays within allowed topics/domains
- **Implementation**: Keyword matching + semantic similarity
- **Config**: Allowed topics, similarity thresholds
- **Performance**: ~15-40ms

#### 4. Cost Precheck

- **Purpose**: Estimate and validate token/cost budgets before LLM call
- **Implementation**: Token counting + cost calculation
- **Config**: Max tokens, cost limits, estimation strategy
- **Performance**: ~5-10ms

### Output Guardrails

#### 5. Output PII Scan

- **Purpose**: Detect PII in LLM responses before showing to user
- **Implementation**: Same as input PII but with different thresholds
- **Config**: Sensitivity levels, action on detection
- **Performance**: ~20-50ms

#### 6. Hallucination Check

- **Purpose**: Flag potential factual inconsistencies or made-up information
- **Implementation**: Template guardrail. Ships with a lightweight heuristic (keyword overlap, entity count mismatch). Real fact verification requires an external API or secondary LLM call and is outside the core framework's scope.
- **Config**: Confidence thresholds, fact sources, optional external verifier
- **Performance**: ~5-10ms for heuristic; seconds if calling an external LLM

#### 7. Toxicity Filter

- **Purpose**: Detect harmful, offensive, or inappropriate content
- **Implementation**: ML classifier (toxicity detection model)
- **Config**: Toxicity thresholds, category filtering
- **Performance**: ~30-80ms

## Execution Flow

### Complete Chain Execution

```typescript
async function executeCompleteChain(
  input: string,
  chain: GuardrailChain,
  llmFunction: (input: string) => Promise<string>,
): Promise<ChainResult> {
  // 1. Execute input guardrails
  const inputResult = await chain.executeInput(input);
  if (!inputResult.passed) {
    return {
      success: false,
      error: 'Input guardrail failed',
      failedGuardrail: inputResult.failedGuardrail,
      metadata: inputResult.metadata,
    };
  }

  // 2. Call LLM with transformed input
  const llmOutput = await llmFunction(inputResult.transformedInput);

  // 3. Execute output guardrails
  const outputResult = await chain.executeOutput(llmOutput, inputResult.context);
  if (!outputResult.passed) {
    return {
      success: false,
      error: 'Output guardrail failed',
      failedGuardrail: outputResult.failedGuardrail,
      metadata: outputResult.metadata,
    };
  }

  // 4. Return final result
  return {
    success: true,
    output: outputResult.transformedOutput,
    metadata: {
      ...inputResult.metadata,
      ...outputResult.metadata,
      totalLatency: inputResult.metadata.latency + outputResult.metadata.latency,
      totalTokens: inputResult.metadata.tokens + outputResult.metadata.tokens,
    },
  };
}
```

### Short-Circuit Logic

```typescript
private async executeGuardrailsWithShortCircuit(
  guardrails: Guardrail[],
  context: ChainContext
): Promise<GuardrailResult[]> {
  const results: GuardrailResult[] = [];

  for (const guardrail of guardrails) {
    // Check budget before execution
    const estimatedCost = guardrail.config?.estimatedCostMs ?? 50;
    if (!this.budgetManager.canExecute(estimatedCost)) {
      results.push({
        passed: true,
        metadata: { skipped: true, reason: 'budget_exceeded' },
      });
      continue;
    }

    // Execute guardrail with timeout
    const result = await this.executeWithTimeout(guardrail, context);
    results.push(result);

    // Short-circuit on failure if configured
    if (!result.passed && guardrail.config.shortCircuitOnFail) {
      break;
    }

    // Update budget
    this.budgetManager.recordExecution(
      result.metadata.duration,
      result.metadata.tokensUsed
    );
  }

  return results;
}
```

### Budget-Aware Scheduling Algorithm

When `skipSlowGuardrailsUnderPressure` is enabled, the chain reorders and skips guardrails using this algorithm:

```typescript
function scheduleGuardrails(guardrails: Guardrail[], budget: BudgetState): Guardrail[] {
  // 1. Filter out disabled guardrails
  const enabled = guardrails.filter((g) => g.enabled);

  // 2. Sort by priority (lower = earlier), then by estimated cost
  const sorted = enabled.sort((a, b) => {
    const pa = a.config?.priority ?? 50;
    const pb = b.config?.priority ?? 50;
    if (pa !== pb) return pa - pb;
    return (a.config?.estimatedCostMs ?? 50) - (b.config?.estimatedCostMs ?? 50);
  });

  // 3. Select guardrails that fit within remaining budget
  let remaining = budget.remainingLatency;
  const selected: Guardrail[] = [];

  for (const g of sorted) {
    const cost = g.config?.estimatedCostMs ?? 50;
    const essential = g.config?.essential ?? false;

    if (cost <= remaining || essential) {
      selected.push(g);
      remaining -= cost;
    }
    // Non-essential guardrails that don't fit are silently skipped
  }

  return selected;
}
```

**Rules:**

1. **Essential guardrails** always run, even if the budget is exceeded.
2. **Non-essential guardrails** are skipped if their `estimatedCostMs` exceeds remaining budget.
3. **Priority** determines execution order; tie-break by estimated cost (cheaper first).
4. Budget is checked again at runtime because estimates may be wrong.

## Error Handling Strategy

### Error Types

```typescript
enum GuardrailErrorType {
  TIMEOUT = 'TIMEOUT',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

class GuardrailError extends Error {
  type: GuardrailErrorType;
  guardrailId: string;
  recoverable: boolean;

  constructor(
    message: string,
    type: GuardrailErrorType,
    guardrailId: string,
    recoverable: boolean = false,
  ) {
    super(message);
    this.type = type;
    this.guardrailId = guardrailId;
    this.recoverable = recoverable;
  }
}
```

### Recovery Strategies

1. **Timeout**: Retry with exponential backoff (max 3 attempts)
2. **Budget Exceeded**: Skip remaining non-critical guardrails
3. **Validation Failed**: Use default configuration or fail fast
4. **Execution Failed**: Log error and continue if recoverable
5. **Configuration Error**: Fail fast with clear error message

## Observability

### Structured Logging

```typescript
interface LogEntry {
  timestamp: string;
  correlationId: string;
  guardrailId: string;
  action: 'start' | 'complete' | 'error' | 'skip';
  duration?: number;
  tokensUsed?: number;
  passed?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

### Metrics (Prometheus Format)

```typescript
// Counter metrics
guardrail_executions_total{guardrail_id, result}
guardrail_errors_total{guardrail_id, error_type}
chain_executions_total{result}

// Histogram metrics
guardrail_execution_duration_seconds{guardrail_id}
guardrail_tokens_used_total{guardrail_id}
chain_execution_duration_seconds

// Gauge metrics
budget_remaining_latency_seconds
budget_remaining_tokens
active_chains
```

### Distributed Tracing (OpenTelemetry)

```typescript
// Each chain execution creates a trace
const tracer = trace.getTracer('guardrail-chain');

const span = tracer.startSpan('execute_chain');
span.setAttribute('correlation_id', correlationId);
span.setAttribute('input_length', input.length);

// Each guardrail creates a child span
const guardrailSpan = tracer.startSpan('execute_guardrail', {
  parent: span,
});
guardrailSpan.setAttribute('guardrail_id', guardrail.id);
guardrailSpan.setAttribute('guardrail_type', guardrail.type);
```

## Performance Optimizations

### 1. Caching Layer

- Cache results of expensive guardrails (e.g., hallucination check)
- Use LRU cache with TTL
- Cache key based on input hash + guardrail config

### 2. Parallel Execution

- Execute independent guardrails in parallel
- Respect dependencies and ordering constraints
- Aggregate results with proper error handling

### 3. Lazy Loading

- Load guardrail modules on demand
- Reduce initial bundle size
- Support dynamic guardrail registration

### 4. Streaming Support

- Process large inputs in chunks
- Stream output for real-time filtering
- Backpressure handling

## Security Considerations

### 1. Input Validation

- Validate all configuration inputs
- Sanitize user-provided data
- Prevent injection attacks in guardrail configs

### 2. Rate Limiting

- Built-in rate limiting guardrail
- Protect against abuse
- Configurable limits per user/session

### 3. Data Privacy

- Never log sensitive input/output
- Support data anonymization
- GDPR compliance features

### 4. Dependency Security

- Regular security audits
- Minimal dependencies
- Automated vulnerability scanning

## Testing Strategy

### Unit Tests

- Test each guardrail in isolation
- Mock external dependencies
- Test edge cases and error scenarios

### Integration Tests

- Test complete chain execution
- Test budget enforcement
- Test short-circuit logic

### Performance Tests

- Benchmark individual guardrails
- Test chain execution under load
- Measure memory usage and leaks

### Security Tests

- Test for injection vulnerabilities
- Test rate limiting effectiveness
- Test data privacy compliance

## Deployment Considerations

### 1. Environment Support

- Node.js 18+
- Browser (with limitations)
- Edge runtimes (Cloudflare Workers, Vercel Edge)

### 2. Scalability

- Stateless design for horizontal scaling
- Redis support for distributed caching
- Database support for persistent state

### 3. Monitoring

- Health check endpoints
- Readiness/liveness probes
- Performance dashboards

### 4. Configuration Management

- Environment-based configuration
- Feature flags for gradual rollout
- A/B testing support

## Extension Points

### 1. Custom Guardrails

```typescript
class CustomGuardrail implements Guardrail {
  id = 'custom-guardrail';
  name = 'My Custom Guardrail';
  type = 'input';
  enabled = true;

  async execute(input: unknown, context: ChainContext): Promise<GuardrailResult> {
    // Custom implementation
    return { passed: true, output: input };
  }
}
```

### 2. Custom Middleware

```typescript
interface ChainMiddleware {
  beforeExecute?(context: ChainContext): Promise<void>;
  afterExecute?(result: ChainResult): Promise<void>;
  onError?(error: Error, context: ChainContext): Promise<void>;
}
```

### 3. Custom Budget Strategies

```typescript
interface BudgetStrategy {
  shouldSkipGuardrail(guardrail: Guardrail, budget: BudgetState): boolean;

  calculateGuardrailPriority(guardrail: Guardrail, context: ChainContext): number;
}
```

## Future Considerations

### 1. AI-Powered Guardrails

- Use LLMs for more sophisticated detection
- Adaptive thresholds based on context
- Self-improving guardrails

### 2. Distributed Guardrails

- Microservice architecture for guardrails
- gRPC communication between guardrails
- Service mesh integration

### 3. Real-time Analytics

- Live dashboard for chain performance
- Anomaly detection in guardrail behavior
- Predictive budget management

### 4. Multi-modal Support

- Image guardrails (NSFW detection, etc.)
- Audio guardrails (transcription validation)
- Video guardrails (content moderation)

## Conclusion

This architecture provides a robust, scalable foundation for building production-ready guardrail pipelines. The design emphasizes performance, extensibility, and observability while maintaining simplicity for common use cases.
