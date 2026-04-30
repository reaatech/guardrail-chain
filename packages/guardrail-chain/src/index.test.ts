import { describe, expect, it } from 'vitest';

// Verify that all public exports are reachable
import {
  BudgetExceededError,
  BudgetManager,
  ChainBuilder,
  CircuitBreaker,
  ConsoleLogger,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RETRY_CONFIG,
  GuardrailChain,
  GuardrailError,
  GuardrailErrorType,
  LRUCache,
  NoOpLogger,
  TimeoutError,
  ValidationError,
  createChainContext,
  generateCorrelationId,
  getLogger,
  getMetrics,
  getTracer,
  hashString,
  setLogger,
  setMetrics,
  setTracer,
  withRetry,
} from './index.js';

describe('Public API exports', () => {
  it('should export core classes', () => {
    expect(GuardrailChain).toBeDefined();
    expect(ChainBuilder).toBeDefined();
    expect(BudgetManager).toBeDefined();
  });

  it('should export context factory', () => {
    expect(createChainContext).toBeDefined();
  });

  it('should export error classes', () => {
    expect(GuardrailError).toBeDefined();
    expect(GuardrailErrorType).toBeDefined();
    expect(TimeoutError).toBeDefined();
    expect(BudgetExceededError).toBeDefined();
    expect(ValidationError).toBeDefined();
  });

  it('should export helpers', () => {
    expect(generateCorrelationId).toBeDefined();
    expect(hashString).toBeDefined();
  });

  it('should export utilities', () => {
    expect(withRetry).toBeDefined();
    expect(CircuitBreaker).toBeDefined();
    expect(LRUCache).toBeDefined();
  });

  it('should export default configs', () => {
    expect(DEFAULT_RETRY_CONFIG).toBeDefined();
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG).toBeDefined();
    expect(DEFAULT_CACHE_CONFIG).toBeDefined();
  });

  it('should re-export observability getters, setters, and implementations', () => {
    expect(typeof getLogger).toBe('function');
    expect(typeof setLogger).toBe('function');
    expect(typeof getMetrics).toBe('function');
    expect(typeof setMetrics).toBe('function');
    expect(typeof getTracer).toBe('function');
    expect(typeof setTracer).toBe('function');
    expect(typeof ConsoleLogger).toBe('function');
    expect(typeof NoOpLogger).toBe('function');
  });
});
