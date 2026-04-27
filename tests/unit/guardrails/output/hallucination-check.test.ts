import { describe, it, expect, vi } from 'vitest';
import { HallucinationCheck } from '../../../../src/guardrails/output/hallucination-check.js';
import { createMockContext } from '../../../utils/mock-context.js';

describe('HallucinationCheck', () => {
  const context = createMockContext();

  it('should pass factual-looking text', async () => {
    const guardrail = new HallucinationCheck();
    const input = 'The Earth orbits the Sun.';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(true);
  });

  it('should flag speculative language', async () => {
    const guardrail = new HallucinationCheck({ threshold: 0.1 });
    const input = 'I think maybe possibly the Earth is flat.';
    const result = await guardrail.execute(input, context);
    expect(result.passed).toBe(false);
    expect(result.metadata?.speculativeCount).toBeGreaterThan(0);
  });

  it('should use external verifier when provided', async () => {
    const verifier = vi.fn().mockResolvedValue({ score: 0.9 });
    const guardrail = new HallucinationCheck({
      threshold: 0.5,
      externalVerifier: verifier,
    });

    const input = 'Some claim';
    const result = await guardrail.execute(input, context);

    expect(verifier).toHaveBeenCalledWith(input);
    expect(result.passed).toBe(false);
    expect(result.metadata?.heuristic).toBe(false);
  });

  it('should handle empty input', async () => {
    const guardrail = new HallucinationCheck();
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
  });

  it('should reject non-string input', async () => {
    const guardrail = new HallucinationCheck();
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});
