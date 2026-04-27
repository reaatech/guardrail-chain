/**
 * Guardrail Chain — Composable, budget-aware input/output guardrail pipeline.
 */

export { GuardrailChain } from './core/chain.js';
export { ChainBuilder } from './core/builder.js';
export { BudgetManager } from './core/budget.js';
export { createChainContext } from './core/context.js';
export type {
  Guardrail,
  GuardrailResult,
  ChainContext,
  ChainConfig,
  ChainResult,
  ChainResultMetadata,
  ExecutionOptions,
  BudgetConfig,
  BudgetState,
  GuardrailConfig,
  ObservabilityConfig,
  ErrorHandlingConfig,
} from './core/types.js';
export {
  getLogger,
  setLogger,
  ConsoleLogger,
  NoOpLogger,
  getMetrics,
  setMetrics,
  getTracer,
  setTracer,
  type Logger,
  type MetricsCollector,
  type Tracer,
  type Span,
} from './observability/index.js';
export {
  GuardrailError,
  GuardrailErrorType,
  TimeoutError,
  BudgetExceededError,
  ValidationError,
} from './utils/errors.js';
export { generateCorrelationId, hashString } from './utils/helpers.js';
export {
  withRetry,
  DEFAULT_RETRY_CONFIG,
  defaultRetryPredicate,
  type RetryConfig,
  type RetryPredicate,
} from './utils/retry.js';
export {
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type CircuitBreakerConfig,
} from './utils/circuit-breaker.js';
export {
  LRUCache,
  DEFAULT_CACHE_CONFIG,
  type CacheConfig,
  type CacheEntry,
} from './utils/cache.js';
