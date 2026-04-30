import { describe, expect, it, vi } from 'vitest';
import { ChainBuilder } from './builder.js';
import type { ChainContext, Guardrail, GuardrailResult } from './types.js';

function createMockPIIRedaction(): Guardrail<string, string> {
  return {
    id: 'pii-redaction',
    name: 'PII Redaction',
    type: 'input',
    enabled: true,
    timeout: 5000,
    execute: vi
      .fn()
      .mockResolvedValue({ passed: true, output: 'Hello world' } satisfies GuardrailResult<string>),
  };
}

function createMockToxicityFilter(config?: { threshold?: number }): Guardrail<string, string> {
  const threshold = config?.threshold ?? 0.7;

  return {
    id: 'toxicity-filter',
    name: 'Toxicity Filter',
    type: 'output',
    enabled: true,
    timeout: 3000,
    execute: vi
      .fn()
      .mockImplementation(
        async (input: string, _context: ChainContext): Promise<GuardrailResult<string>> => {
          const toxicWords = ['stupid', 'idiot', 'moron', 'hate', 'kill', 'die'];
          const lowerInput = input.toLowerCase();
          let score = 0;
          for (const word of toxicWords) {
            const matches = lowerInput.match(new RegExp(`\\b${word}\\b`, 'gi'));
            if (matches) {
              score += matches.length * 0.2;
            }
          }
          score = Math.min(score, 1);
          const passed = score < threshold;
          return {
            passed,
            output: passed ? input : '[Content flagged as potentially toxic]',
            confidence: 1 - score,
            metadata: { duration: 0, score, threshold },
          };
        },
      ),
  };
}

describe('ChainBuilder', () => {
  it('should build a chain with budget and guardrails', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 500, maxTokens: 2000 })
      .withGuardrail(createMockPIIRedaction())
      .withGuardrail(createMockToxicityFilter())
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should disable slow guardrail skipping', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 100, maxTokens: 1000 })
      .withSlowGuardrailSkipping(false)
      .withGuardrail(createMockPIIRedaction())
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should add multiple guardrails at once', async () => {
    const chain = new ChainBuilder()
      .withGuardrails([createMockPIIRedaction(), createMockToxicityFilter()])
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should propagate error handling configuration', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 500, maxTokens: 2000 })
      .withErrorHandling({ maxRetries: 2, retryDelayMs: 50 })
      .withGuardrail(createMockPIIRedaction())
      .build();

    const result = await chain.execute('Hello world');
    expect(result.success).toBe(true);
  });

  it('should handle guardrail failure with short-circuit', async () => {
    const chain = new ChainBuilder()
      .withBudget({ maxLatencyMs: 500, maxTokens: 2000 })
      .withGuardrail(createMockToxicityFilter({ threshold: 0.5 }))
      .build();

    const result = await chain.execute('You are a stupid idiot moron');
    expect(result.success).toBe(false);
    expect(result.failedGuardrail).toBe('toxicity-filter');
  });
});
