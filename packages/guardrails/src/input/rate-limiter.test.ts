import { describe, expect, it } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  const context = createMockContext();

  it('should allow requests under the limit', async () => {
    const guardrail = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
    for (let i = 0; i < 3; i++) {
      const result = await guardrail.execute('test', context);
      expect(result.passed).toBe(true);
    }
  });

  it('should block requests over the limit', async () => {
    const guardrail = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
    await guardrail.execute('test', context);
    await guardrail.execute('test', context);
    const result = await guardrail.execute('test', context);
    expect(result.passed).toBe(false);
    expect(result.metadata?.rateLimited).toBe(true);
  });

  it('should track per-user limits', async () => {
    const guardrail = new RateLimiter({ windowMs: 1000, maxRequests: 1 });
    const ctx1 = createMockContext({ userId: 'user-1' });
    const ctx2 = createMockContext({ userId: 'user-2' });

    await guardrail.execute('test', ctx1);
    const result1 = await guardrail.execute('test', ctx1);
    expect(result1.passed).toBe(false);

    const result2 = await guardrail.execute('test', ctx2);
    expect(result2.passed).toBe(true);
  });

  it('should evict oldest client when maxTrackedClients is exceeded', async () => {
    const guardrail = new RateLimiter({ windowMs: 60000, maxRequests: 100, maxTrackedClients: 3 });

    const ctx1 = createMockContext({ userId: 'user-1' });
    const ctx2 = createMockContext({ userId: 'user-2' });
    const ctx3 = createMockContext({ userId: 'user-3' });
    const ctx4 = createMockContext({ userId: 'user-4' });

    await guardrail.execute('test', ctx1);
    await guardrail.execute('test', ctx2);
    await guardrail.execute('test', ctx3);
    // Adding client 4 should evict client 1 (oldest)
    await guardrail.execute('test', ctx4);

    // Client 1 should now have a clean slate and pass (its window was evicted)
    const result = await guardrail.execute('test', ctx1);
    expect(result.passed).toBe(true);
  });
});
