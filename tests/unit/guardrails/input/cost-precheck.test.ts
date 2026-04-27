import { describe, it, expect } from 'vitest';
import { CostPrecheck } from '../../../../src/guardrails/input/cost-precheck.js';
import { createMockContext } from '../../../utils/mock-context.js';

describe('CostPrecheck', () => {
  const guardrail = new CostPrecheck();
  const context = createMockContext();

  it('should pass input within token budget', async () => {
    const input = 'Short input';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.metadata?.estimatedTokens).toBeLessThan(10);
  });

  it('should fail input exceeding token budget', async () => {
    const strict = new CostPrecheck({ maxTokens: 1 });
    const input = 'This is way too long for one token';
    const result = await strict.execute(input, context);
    expect(result.passed).toBe(false);
  });

  it('should use context budget when no maxTokens specified', async () => {
    const ctx = createMockContext({
      budget: { remainingLatency: 1000, remainingTokens: 10, usedLatency: 0, usedTokens: 0 },
    });
    const input = 'a'.repeat(50); // ~12 tokens
    const result = await guardrail.execute(input, ctx);
    expect(result.passed).toBe(false);
  });

  it('should respect maxCharacters', async () => {
    const strict = new CostPrecheck({ maxCharacters: 5 });
    const result = await strict.execute('hello world', context);
    expect(result.passed).toBe(false);
  });

  it('should handle empty input', async () => {
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
  });

  it('should reject non-string input', async () => {
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Trigger catch by passing a context without a budget object
    const badContext = {
      ...createMockContext(),
      budget: undefined as unknown as typeof context.budget,
    };

    const result = await guardrail.execute('test', badContext);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});
