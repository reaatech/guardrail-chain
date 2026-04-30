import { describe, expect, it, vi } from 'vitest';
import { GuardrailChain } from './chain.js';
import type { Guardrail } from './types.js';

describe('GuardrailChain', () => {
  const defaultConfig = { budget: { maxLatencyMs: 1000, maxTokens: 4000 } };

  it('should execute guardrails in sequence', async () => {
    const chain = new GuardrailChain(defaultConfig);
    const executionOrder: string[] = [];

    const guardrail1: Guardrail = {
      id: 'gr-1',
      name: 'GR1',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('1');
        return { passed: true, output: 'test1' };
      }),
    };

    const guardrail2: Guardrail = {
      id: 'gr-2',
      name: 'GR2',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('2');
        return { passed: true, output: 'test2' };
      }),
    };

    chain.addGuardrail(guardrail1).addGuardrail(guardrail2);
    const result = await chain.execute('hello');

    expect(result.success).toBe(true);
    expect(executionOrder).toEqual(['1', '2']);
  });

  it('should short-circuit on failure', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const guardrail1: Guardrail = {
      id: 'gr-1',
      name: 'GR1',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: false }),
    };

    const guardrail2: Guardrail = {
      id: 'gr-2',
      name: 'GR2',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'test' }),
    };

    chain.addGuardrail(guardrail1).addGuardrail(guardrail2);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(guardrail1.execute).toHaveBeenCalled();
    expect(guardrail2.execute).not.toHaveBeenCalled();
  });

  it('should pass transformed input between guardrails', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const guardrail1: Guardrail = {
      id: 'gr-1',
      name: 'GR1',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'transformed' }),
    };

    const guardrail2: Guardrail = {
      id: 'gr-2',
      name: 'GR2',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'final' }),
    };

    chain.addGuardrail(guardrail1).addGuardrail(guardrail2);
    await chain.execute('original');

    expect(guardrail2.execute).toHaveBeenCalledWith('transformed', expect.anything());
  });

  it('should handle disabled guardrails', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const guardrail: Guardrail = {
      id: 'gr-1',
      name: 'GR1',
      type: 'input',
      enabled: false,
      execute: vi.fn().mockResolvedValue({ passed: true }),
    };

    chain.addGuardrail(guardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(true);
    expect(guardrail.execute).not.toHaveBeenCalled();
  });

  it('should include correlationId in result metadata', async () => {
    const chain = new GuardrailChain(defaultConfig);
    const result = await chain.execute('hello', { correlationId: 'abc-123' });

    expect(result.success).toBe(true);
    expect(result.metadata?.correlationId).toBe('abc-123');
  });

  it('should handle guardrail execution errors', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const throwingGuardrail: Guardrail = {
      id: 'gr-throw',
      name: 'Throwing',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockRejectedValue(new Error('Boom')),
    };

    chain.addGuardrail(throwingGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(result.failedGuardrail).toBe('gr-throw');
  });

  it('should timeout slow guardrails', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 1000, maxTokens: 4000 },
    });

    const slowGuardrail: Guardrail = {
      id: 'gr-slow',
      name: 'Slow',
      type: 'input',
      enabled: true,
      timeout: 50,
      execute: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ passed: true }), 200)),
        ),
    };

    chain.addGuardrail(slowGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(result.failedGuardrail).toBe('gr-slow');
  });

  it('should return error when output guardrail fails', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const outputGuardrail: Guardrail = {
      id: 'gr-output',
      name: 'Output Fail',
      type: 'output',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: false, error: new Error('bad output') }),
    };

    chain.addGuardrail(outputGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(result.error).toContain('bad output');
    expect(result.failedGuardrail).toBe('gr-output');
  });

  it('should skip guardrails when budget is exceeded in prepareGuardrails', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 10, maxTokens: 4000, skipSlowGuardrailsUnderPressure: true },
    });

    const expensiveGuardrail: Guardrail = {
      id: 'gr-expensive',
      name: 'Expensive',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'test' }),
    };

    chain.addGuardrail(expensiveGuardrail);
    const result = await chain.execute('hello');

    // Should pass because guardrail is skipped due to budget in prepareGuardrails
    expect(result.success).toBe(true);
    expect(expensiveGuardrail.execute).not.toHaveBeenCalled();
  });

  it('should skip guardrails when budget is exceeded in runGuardrails', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 10, maxTokens: 4000, skipSlowGuardrailsUnderPressure: false },
    });

    const expensiveGuardrail: Guardrail = {
      id: 'gr-expensive',
      name: 'Expensive',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'test' }),
    };

    chain.addGuardrail(expensiveGuardrail);
    const result = await chain.execute('hello');

    // Should pass because guardrail is skipped due to budget in runGuardrails
    expect(result.success).toBe(true);
    expect(expensiveGuardrail.execute).not.toHaveBeenCalled();
  });

  it('should expose executeOutput directly', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const outputGuardrail: Guardrail = {
      id: 'gr-output',
      name: 'Output Fail',
      type: 'output',
      enabled: true,
      execute: vi.fn().mockResolvedValue({
        passed: false,
        error: new Error('bad output'),
      }),
    };

    chain.addGuardrail(outputGuardrail);
    const result = await chain.executeOutput('test', {
      correlationId: 'test-id',
      budget: { remainingLatency: 1000, remainingTokens: 4000, usedLatency: 0, usedTokens: 0 },
      metadata: {},
      transformedInput: 'test',
      originalInput: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('bad output');
    expect(result.failedGuardrail).toBe('gr-output');
  });

  it('should not skip guardrails when skipSlowGuardrails is false', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 100, maxTokens: 4000, skipSlowGuardrailsUnderPressure: false },
    });

    const guardrail: Guardrail = {
      id: 'gr-1',
      name: 'GR1',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'test' }),
    };

    chain.addGuardrail(guardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(true);
    expect(guardrail.execute).toHaveBeenCalled();
  });

  it('should expose executeInput directly', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const inputGuardrail: Guardrail = {
      id: 'gr-input',
      name: 'Input Transform',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'transformed' }),
    };

    chain.addGuardrail(inputGuardrail);
    const result = await chain.executeInput('original', { correlationId: 'test-id' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('transformed');
  });

  it('should retry on recoverable errors when errorHandling config is provided', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 1000, maxTokens: 4000 },
      errorHandling: { maxRetries: 2, retryDelayMs: 10 },
    });

    const flakyGuardrail: Guardrail = {
      id: 'gr-flaky',
      name: 'Flaky',
      type: 'input',
      enabled: true,
      execute: vi
        .fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Connection timed out'))
        .mockResolvedValue({ passed: true, output: 'recovered' }),
    };

    chain.addGuardrail(flakyGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(true);
    expect(result.output).toBe('recovered');
    expect(flakyGuardrail.execute).toHaveBeenCalledTimes(3);
  });

  it('should not retry when errorHandling config is not provided', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const flakyGuardrail: Guardrail = {
      id: 'gr-flaky',
      name: 'Flaky',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockRejectedValue(new Error('Request timeout')),
    };

    chain.addGuardrail(flakyGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(flakyGuardrail.execute).toHaveBeenCalledTimes(1);
  });

  it('should continue past a failing guardrail when shortCircuitOnFail is false', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const failing: Guardrail = {
      id: 'gr-fail',
      name: 'Fail',
      type: 'input',
      enabled: true,
      shortCircuitOnFail: false,
      execute: vi.fn().mockResolvedValue({ passed: false, error: new Error('nope') }),
    };
    const next: Guardrail = {
      id: 'gr-next',
      name: 'Next',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'ok' }),
    };

    chain.addGuardrail(failing).addGuardrail(next);
    const result = await chain.execute('hello');

    // Chain reports failure (the first failure wins) but the second guardrail still ran.
    expect(result.success).toBe(false);
    expect(result.failedGuardrail).toBe('gr-fail');
    expect(next.execute).toHaveBeenCalled();
  });

  it('should share budget across input and output phases', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 40, maxTokens: 4000, skipSlowGuardrailsUnderPressure: true },
    });

    const inputGuardrail: Guardrail = {
      id: 'gr-in',
      name: 'In',
      type: 'input',
      enabled: true,
      estimatedCostMs: 30,
      execute: vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ passed: true, output: 'transformed' }), 30),
            ),
        ),
    };
    const outputGuardrail: Guardrail = {
      id: 'gr-out',
      name: 'Out',
      type: 'output',
      enabled: true,
      estimatedCostMs: 30,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'done' }),
    };

    chain.addGuardrail(inputGuardrail).addGuardrail(outputGuardrail);
    const result = await chain.execute('hello');

    // Input consumed ~30ms of the 40ms budget; output is budget-skipped.
    expect(result.success).toBe(true);
    expect(inputGuardrail.execute).toHaveBeenCalled();
    expect(outputGuardrail.execute).not.toHaveBeenCalled();
  });

  it('should handle non-Error throws in guardrail execution', async () => {
    const chain = new GuardrailChain(defaultConfig);

    const throwingGuardrail: Guardrail = {
      id: 'gr-string-throw',
      name: 'String Throw',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockRejectedValue('just a string'),
    };

    chain.addGuardrail(throwingGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(result.failedGuardrail).toBe('gr-string-throw');
    expect(result.error).toContain('just a string');
  });

  it('should respect guardrail estimatedCostMs and essential properties', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 100, maxTokens: 4000, skipSlowGuardrailsUnderPressure: true },
    });

    const cheapGuardrail: Guardrail & { estimatedCostMs: number } = {
      id: 'gr-cheap',
      name: 'Cheap',
      type: 'input',
      enabled: true,
      estimatedCostMs: 10,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'cheap' }),
    };

    const essentialGuardrail: Guardrail & { estimatedCostMs: number; essential: boolean } = {
      id: 'gr-essential',
      name: 'Essential',
      type: 'input',
      enabled: true,
      estimatedCostMs: 50,
      essential: true,
      execute: vi.fn().mockResolvedValue({ passed: true, output: 'essential' }),
    };

    chain.addGuardrail(cheapGuardrail).addGuardrail(essentialGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(true);
    expect(cheapGuardrail.execute).toHaveBeenCalled();
    expect(essentialGuardrail.execute).toHaveBeenCalled();
  });

  it('should not retry non-recoverable errors even with errorHandling config', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 1000, maxTokens: 4000 },
      errorHandling: { maxRetries: 3, retryDelayMs: 10 },
    });

    const fatalGuardrail: Guardrail = {
      id: 'gr-fatal',
      name: 'Fatal',
      type: 'input',
      enabled: true,
      execute: vi.fn().mockRejectedValue(new Error('Invalid configuration')),
    };

    chain.addGuardrail(fatalGuardrail);
    const result = await chain.execute('hello');

    expect(result.success).toBe(false);
    expect(fatalGuardrail.execute).toHaveBeenCalledTimes(1);
  });
});
