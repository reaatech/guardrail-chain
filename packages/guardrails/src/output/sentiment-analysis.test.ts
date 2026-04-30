import { describe, expect, it } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { SentimentAnalysis } from './sentiment-analysis.js';

describe('SentimentAnalysis', () => {
  const context = createMockContext();

  it('should pass neutral text', async () => {
    const guardrail = new SentimentAnalysis();
    const result = await guardrail.execute('The weather is cloudy today.', context);
    expect(result.passed).toBe(true);
  });

  it('should pass positive text', async () => {
    const guardrail = new SentimentAnalysis();
    const result = await guardrail.execute('This is a great and amazing product!', context);
    expect(result.passed).toBe(true);
    expect(result.metadata?.positive).toBeGreaterThan(0);
  });

  it('should flag overly negative text', async () => {
    const guardrail = new SentimentAnalysis({ threshold: -0.2 });
    const result = await guardrail.execute('This is terrible and awful.', context);
    expect(result.passed).toBe(false);
    expect(result.metadata?.negative).toBeGreaterThan(0);
  });

  it('should allow negative when configured', async () => {
    const guardrail = new SentimentAnalysis({ allowNegative: true });
    const result = await guardrail.execute('This is terrible.', context);
    expect(result.passed).toBe(true);
  });

  it('should handle empty input', async () => {
    const guardrail = new SentimentAnalysis();
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
  });

  it('should reject non-string input', async () => {
    const guardrail = new SentimentAnalysis();
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
  });
});
