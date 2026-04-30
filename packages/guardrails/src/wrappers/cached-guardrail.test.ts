import type { Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { CachedGuardrail } from './cached-guardrail.js';

describe('CachedGuardrail', () => {
  const context = createMockContext();

  function createMockGuardrail(
    executeImpl?: () => Promise<GuardrailResult<string>>,
  ): Guardrail<string, string> {
    return {
      id: 'mock-gr',
      name: 'Mock Guardrail',
      type: 'input',
      enabled: true,
      execute: vi
        .fn()
        .mockImplementation(executeImpl ?? (async () => ({ passed: true, output: 'transformed' }))),
    };
  }

  it('should call wrapped guardrail on first execute', async () => {
    const wrapped = createMockGuardrail();
    const cached = new CachedGuardrail(wrapped);

    const result = await cached.execute('hello', context);

    expect(result.passed).toBe(true);
    expect(result.output).toBe('transformed');
    expect(wrapped.execute).toHaveBeenCalledTimes(1);
    expect(result.metadata?.fromCache).toBe(false);
  });

  it('should return cached result on second execute with same input', async () => {
    const wrapped = createMockGuardrail();
    const cached = new CachedGuardrail(wrapped);

    await cached.execute('hello', context);
    const result = await cached.execute('hello', context);

    expect(result.passed).toBe(true);
    expect(result.output).toBe('transformed');
    expect(wrapped.execute).toHaveBeenCalledTimes(1);
    expect(result.metadata?.fromCache).toBe(true);
  });

  it('should not cache failed results', async () => {
    const wrapped = createMockGuardrail(async () => ({ passed: false, error: new Error('fail') }));
    const cached = new CachedGuardrail(wrapped);

    await cached.execute('hello', context);
    const result = await cached.execute('hello', context);

    expect(result.passed).toBe(false);
    expect(wrapped.execute).toHaveBeenCalledTimes(2);
  });

  it('should compute different cache keys for different inputs', async () => {
    const wrapped: Guardrail<string, string> = {
      id: 'mock-gr',
      name: 'Mock Guardrail',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockImplementation(async (input: string) => ({
        passed: true,
        output: input,
      })),
    };
    const cached = new CachedGuardrail(wrapped);

    const r1 = await cached.execute('a', context);
    const r2 = await cached.execute('b', context);

    expect(r1.output).toBe('a');
    expect(r2.output).toBe('b');
    expect(wrapped.execute).toHaveBeenCalledTimes(2);
  });

  it('should respect TTL and evict expired entries', async () => {
    const wrapped = createMockGuardrail();
    const cached = new CachedGuardrail(wrapped, { ttlMs: 50, maxSize: 100 });

    await cached.execute('hello', context);
    await new Promise((r) => setTimeout(r, 60));
    const result = await cached.execute('hello', context);

    expect(result.metadata?.fromCache).toBe(false);
    expect(wrapped.execute).toHaveBeenCalledTimes(2);
  });

  it('should derive id, name, type, timeout from wrapped guardrail', () => {
    const wrapped = createMockGuardrail();
    wrapped.timeout = 5000;
    const cached = new CachedGuardrail(wrapped);

    expect(cached.id).toBe('cached-mock-gr');
    expect(cached.name).toBe('Cached Mock Guardrail');
    expect(cached.type).toBe('input');
    expect(cached.timeout).toBe(5000);
  });

  it('should propagate essential, shortCircuitOnFail, priority, estimatedCostMs from wrapped guardrail', () => {
    const wrapped = createMockGuardrail();
    wrapped.essential = true;
    wrapped.shortCircuitOnFail = false;
    wrapped.priority = 10;
    wrapped.estimatedCostMs = 200;
    const cached = new CachedGuardrail(wrapped);

    expect(cached.essential).toBe(true);
    expect(cached.shortCircuitOnFail).toBe(false);
    expect(cached.priority).toBe(10);
    expect(cached.estimatedCostMs).toBe(200);
  });

  it('should preserve original execution duration on cache hit', async () => {
    const wrapped = createMockGuardrail(async () => ({
      passed: true,
      output: 'ok',
      metadata: { duration: 42 },
    }));
    const cached = new CachedGuardrail(wrapped);

    await cached.execute('hello', context);
    const result = await cached.execute('hello', context);

    expect(result.metadata?.fromCache).toBe(true);
    expect(result.metadata?.duration).toBe(42);
    expect(result.metadata?.cacheAccessDuration).toBeDefined();
    expect(typeof result.metadata?.cacheAccessDuration).toBe('number');
  });

  it('should include cacheAccessDuration on cache miss too', async () => {
    const wrapped = createMockGuardrail(async () => ({
      passed: true,
      output: 'ok',
      metadata: { duration: 10 },
    }));
    const cached = new CachedGuardrail(wrapped);

    const result = await cached.execute('hello', context);

    expect(result.metadata?.fromCache).toBe(false);
    expect(result.metadata?.cacheAccessDuration).toBeDefined();
    expect(typeof result.metadata?.cacheAccessDuration).toBe('number');
  });
});
