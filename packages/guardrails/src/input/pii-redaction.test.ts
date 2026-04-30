import { describe, expect, it } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { PIIRedaction } from './pii-redaction.js';

describe('PIIRedaction', () => {
  const guardrail = new PIIRedaction();
  const context = createMockContext();

  it('should pass clean input unchanged', async () => {
    const input = 'Hello, how can I help you?';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).toBe(input);
  });

  it('should redact email addresses', async () => {
    const input = 'Contact me at john@example.com';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).not.toContain('john@example.com');
    expect(result.output).toContain('[EMAIL]');
  });

  it('should redact phone numbers', async () => {
    const input = 'Call me at 555-123-4567';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).not.toContain('555-123-4567');
    expect(result.output).toContain('[PHONE_NUMBER]');
  });

  it('should redact SSNs', async () => {
    const input = 'My SSN is 123-45-6789';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).not.toContain('123-45-6789');
    expect(result.output).toContain('[SSN_OR_ID_NUMBER]');
  });

  it('should redact credit cards that pass Luhn check', async () => {
    const input = 'Card: 4111-1111-1111-1111';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).not.toContain('4111-1111-1111-1111');
    expect(result.output).toContain('[CREDIT_CARD_NUMBER]');
  });

  it('should not redact 16-digit sequences that fail Luhn check', async () => {
    const input = 'Reference: 1234-5678-9012-3456';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
    expect(result.output).toBe(input);
    expect(result.output).not.toContain('[CREDIT_CARD_NUMBER]');
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

  it('should support remove strategy', async () => {
    const removeGuardrail = new PIIRedaction({ redactionStrategy: 'remove' });
    const input = 'Email: test@example.com here';
    const result = await removeGuardrail.execute(input, context);
    expect(result.output).not.toContain('test@example.com');
    expect(result.output).not.toContain('[EMAIL]');
  });
});
