import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('should allow calls when closed', async () => {
    const cb = new CircuitBreaker('test');
    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const cb = new CircuitBreaker('test', {
      failureThreshold: 3,
      resetTimeoutMs: 10000,
      successThreshold: 1,
    });

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // expected
      }
    }

    expect(cb.getState()).toBe('OPEN');
    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow('OPEN');
  });

  it('should transition to half-open after reset timeout', async () => {
    const cb = new CircuitBreaker('test', {
      failureThreshold: 1,
      resetTimeoutMs: 50,
      successThreshold: 1,
    });

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // expected
    }

    expect(cb.getState()).toBe('OPEN');
    await new Promise((r) => setTimeout(r, 60));

    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should return to open on half-open failure', async () => {
    const cb = new CircuitBreaker('test', {
      failureThreshold: 1,
      resetTimeoutMs: 50,
      successThreshold: 2,
    });

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // expected
    }

    await new Promise((r) => setTimeout(r, 60));

    try {
      await cb.execute(() => Promise.reject(new Error('fail again')));
    } catch {
      // expected
    }

    expect(cb.getState()).toBe('OPEN');
  });

  it('should track metrics', async () => {
    const cb = new CircuitBreaker('test', {
      failureThreshold: 2,
      resetTimeoutMs: 10000,
      successThreshold: 1,
    });

    await cb.execute(() => Promise.resolve('ok'));
    let metrics = cb.getMetrics();
    expect(metrics.state).toBe('CLOSED');
    expect(metrics.failures).toBe(0);

    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // expected
    }
    metrics = cb.getMetrics();
    expect(metrics.failures).toBe(1);
  });
});
