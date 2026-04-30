import { describe, expect, it } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { ContentModeration } from './content-moderation.js';

describe('ContentModeration', () => {
  const context = createMockContext();

  it('should pass when no rules match', async () => {
    const guardrail = new ContentModeration();
    const result = await guardrail.execute('Hello world', context);
    expect(result.passed).toBe(true);
  });

  it('should block on matching block rule', async () => {
    const guardrail = new ContentModeration({
      rules: [{ id: 'no-spam', pattern: 'buy now', action: 'block' }],
    });
    const result = await guardrail.execute('Buy now for cheap prices', context);
    expect(result.passed).toBe(false);
    expect(result.output).toContain('blocked');
  });

  it('should flag on matching flag rule', async () => {
    const guardrail = new ContentModeration({
      rules: [{ id: 'suspicious', pattern: 'click here', action: 'flag' }],
    });
    const result = await guardrail.execute('Click here to win', context);
    expect(result.passed).toBe(true);
    expect(result.metadata?.violations).toHaveLength(1);
    expect((result.metadata?.violations as Array<{ ruleId: string }>)[0].ruleId).toBe('suspicious');
  });

  it('should handle empty input', async () => {
    const guardrail = new ContentModeration();
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
  });

  it('should reject non-string input', async () => {
    const guardrail = new ContentModeration();
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
  });
});
