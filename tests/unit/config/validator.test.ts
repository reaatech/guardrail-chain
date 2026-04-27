import { describe, it, expect } from 'vitest';
import { validateConfig, validateConfigSafe } from '../../../src/config/validator.js';

describe('validateConfig', () => {
  it('should validate a correct config', () => {
    const config = {
      budget: { maxLatencyMs: 500, maxTokens: 2000 },
      guardrails: [{ id: 'pii', type: 'input', enabled: true }],
    };
    const result = validateConfig(config);
    expect(result.budget.maxLatencyMs).toBe(500);
    expect(result.guardrails).toHaveLength(1);
  });

  it('should throw on invalid budget', () => {
    expect(() =>
      validateConfig({
        budget: { maxLatencyMs: -1, maxTokens: 100 },
      }),
    ).toThrow();
  });

  it('should throw on missing budget', () => {
    expect(() => validateConfig({})).toThrow();
  });

  it('should throw on invalid guardrail type', () => {
    expect(() =>
      validateConfig({
        budget: { maxLatencyMs: 100, maxTokens: 100 },
        guardrails: [{ id: 'x', type: 'invalid', enabled: true }],
      }),
    ).toThrow();
  });
});

describe('validateConfigSafe', () => {
  it('should return success for valid config', () => {
    const result = validateConfigSafe({
      budget: { maxLatencyMs: 100, maxTokens: 100 },
    });
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
  });

  it('should return error for invalid config', () => {
    const result = validateConfigSafe({ budget: {} });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
