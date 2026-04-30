import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { MemoryLimit } from './memory-limit.js';

describe('MemoryLimit', () => {
  const context = createMockContext();

  it('should pass when memory is within limit', async () => {
    const guardrail = new MemoryLimit({ maxMemoryMB: 999999 });
    const result = await guardrail.execute('hello', context);

    expect(result.passed).toBe(true);
    expect(result.output).toBe('hello');
    expect(result.metadata?.heapUsedMB).toBeDefined();
  });

  it('should fail when memory exceeds limit', async () => {
    const guardrail = new MemoryLimit({ maxMemoryMB: 1 });
    const result = await guardrail.execute('hello', context);

    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.metadata?.heapUsedMB).toBeDefined();
  });

  it('should use default limit of 512MB', async () => {
    const guardrail = new MemoryLimit();
    const result = await guardrail.execute('hello', context);

    // Should pass because test environment uses less than 512MB
    expect(result.passed).toBe(true);
    expect(result.metadata?.maxMemoryMB).toBe(512);
  });

  it('should handle errors from process.memoryUsage gracefully', async () => {
    const original = process.memoryUsage;
    process.memoryUsage = vi.fn(() => {
      throw new Error('memory usage unavailable');
    }) as unknown as NodeJS.MemoryUsageFn;

    const guardrail = new MemoryLimit();
    const result = await guardrail.execute('hello', context);

    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();

    process.memoryUsage = original;
  });

  it('should skip gracefully when process.memoryUsage is unavailable', async () => {
    const original = process.memoryUsage;
    Object.defineProperty(process, 'memoryUsage', {
      value: undefined,
      configurable: true,
    });

    const guardrail = new MemoryLimit();
    const result = await guardrail.execute('hello', context);

    expect(result.passed).toBe(true);
    expect(result.metadata?.skipped).toBe(true);

    Object.defineProperty(process, 'memoryUsage', {
      value: original,
      configurable: true,
    });
  });
});
