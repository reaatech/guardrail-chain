import { describe, it, expect } from 'vitest';
import { PIIScan } from '../../../../src/guardrails/output/pii-scan.js';
import { createMockContext } from '../../../utils/mock-context.js';

describe('PIIScan', () => {
  const guardrail = new PIIScan();
  const context = createMockContext();

  it('should detect PII in output', async () => {
    const input = 'Contact me at john@example.com';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).not.toContain('john@example.com');
    expect(result.output).toContain('[EMAIL]');
  });

  it('should pass clean output unchanged', async () => {
    const input = 'Hello world';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).toBe(input);
  });

  it('should support high sensitivity (remove strategy)', async () => {
    const strict = new PIIScan({ sensitivity: 'high' });
    const input = 'Email: test@example.com here';
    const result = await strict.execute(input, context);
    expect(result.output).not.toContain('test@example.com');
    expect(result.output).not.toContain('[EMAIL]');
  });

  it('should handle empty input', async () => {
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
    expect(result.output).toBe('');
  });

  it('should fail on non-string input', async () => {
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
    expect(result.error?.message).toContain('Invalid input');
  });
});
