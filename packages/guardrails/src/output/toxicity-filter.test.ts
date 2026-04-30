import { describe, expect, it } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { ToxicityFilter } from './toxicity-filter.js';

describe('ToxicityFilter', () => {
  const guardrail = new ToxicityFilter();
  const context = createMockContext();

  it('should pass clean output', async () => {
    const input = 'Thank you for your help!';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).toBe(input);
  });

  it('should flag toxic content', async () => {
    const strictGuardrail = new ToxicityFilter({ threshold: 0.3 });
    const input = 'You are stupid and worthless';
    const result = await strictGuardrail.execute(input, context);
    expect(result.passed).toBe(false);
    expect(result.output).toContain('flagged');
  });

  it('should handle empty input', async () => {
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
    expect(result.output).toBe('');
  });

  it('should reject non-string input', async () => {
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});
