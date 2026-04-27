import { describe, it, expect } from 'vitest';
import { ChainBuilder } from '../../../src/core/builder.js';
import { PIIRedaction, ToxicityFilter } from '../../../src/guardrails/index.js';

describe('ChainBuilder', () => {
  it('should build a chain with budget and guardrails', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 500, maxTokens: 2000 })
      .withGuardrail(new PIIRedaction())
      .withGuardrail(new ToxicityFilter())
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should disable slow guardrail skipping', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 100, maxTokens: 1000 })
      .withSlowGuardrailSkipping(false)
      .withGuardrail(new PIIRedaction())
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should add multiple guardrails at once', async () => {
    const chain = new ChainBuilder()
      .withGuardrails([new PIIRedaction(), new ToxicityFilter()])
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should propagate error handling configuration', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 500, maxTokens: 2000 })
      .withErrorHandling({ maxRetries: 2, retryDelayMs: 50 })
      .withGuardrail(new PIIRedaction())
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should handle guardrail failure with short-circuit', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 500, maxTokens: 2000 })
      .withGuardrail(new ToxicityFilter({ threshold: 0.5 }))
      .build();

    const result = await chain.execute('You are a stupid idiot moron');
    expect(result.success).toBe(false);
    expect(result.failedGuardrail).toBe('toxicity-filter');
  });
});
