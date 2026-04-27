import { describe, it, expect, vi } from 'vitest';
import { withRetry, defaultRetryPredicate } from '../../../src/utils/retry.js';

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on recoverable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, defaultRetryPredicate, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      multiplier: 1,
      jitter: false,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('timeout'));

    await expect(
      withRetry(fn, defaultRetryPredicate, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        multiplier: 1,
        jitter: false,
      }),
    ).rejects.toThrow('timeout');

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should not retry non-recoverable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal error'));

    await expect(
      withRetry(fn, defaultRetryPredicate, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        multiplier: 1,
        jitter: false,
      }),
    ).rejects.toThrow('fatal error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use custom predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('custom'));
    const predicate = (error: Error) => error.message === 'custom';

    await expect(
      withRetry(fn, predicate, {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        multiplier: 1,
        jitter: false,
      }),
    ).rejects.toThrow('custom');

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('defaultRetryPredicate', () => {
  it('should match timeout errors', () => {
    expect(defaultRetryPredicate(new Error('Request timeout'), 0)).toBe(true);
    expect(defaultRetryPredicate(new Error('Connection timed out'), 0)).toBe(true);
  });

  it('should match network errors', () => {
    expect(defaultRetryPredicate(new Error('ECONNRESET'), 0)).toBe(true);
    expect(defaultRetryPredicate(new Error('ECONNREFUSED'), 0)).toBe(true);
  });

  it('should match rate limit errors', () => {
    expect(defaultRetryPredicate(new Error('Too many requests'), 0)).toBe(true);
    expect(defaultRetryPredicate(new Error('Rate limit exceeded'), 0)).toBe(true);
  });

  it('should not match fatal errors', () => {
    expect(defaultRetryPredicate(new Error('Invalid configuration'), 0)).toBe(false);
    expect(defaultRetryPredicate(new Error('Unauthorized'), 0)).toBe(false);
  });
});
