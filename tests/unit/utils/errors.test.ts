import { describe, it, expect } from 'vitest';
import {
  GuardrailError,
  GuardrailErrorType,
  TimeoutError,
  BudgetExceededError,
  ValidationError,
} from '../../../src/utils/errors.js';

describe('Error classes', () => {
  it('should create GuardrailError with all properties', () => {
    const error = new GuardrailError(
      'Something failed',
      GuardrailErrorType.EXECUTION_FAILED,
      'gr-1',
      true,
    );
    expect(error.message).toBe('Something failed');
    expect(error.type).toBe(GuardrailErrorType.EXECUTION_FAILED);
    expect(error.guardrailId).toBe('gr-1');
    expect(error.recoverable).toBe(true);
    expect(error.name).toBe('GuardrailError');
  });

  it('should create TimeoutError', () => {
    const error = new TimeoutError('gr-timeout');
    expect(error.message).toContain('gr-timeout timed out');
    expect(error.type).toBe(GuardrailErrorType.TIMEOUT);
    expect(error.guardrailId).toBe('gr-timeout');
    expect(error.recoverable).toBe(true);
    expect(error.name).toBe('TimeoutError');
  });

  it('should create BudgetExceededError', () => {
    const error = new BudgetExceededError('gr-budget');
    expect(error.message).toContain('Budget exceeded');
    expect(error.type).toBe(GuardrailErrorType.BUDGET_EXCEEDED);
    expect(error.guardrailId).toBe('gr-budget');
    expect(error.recoverable).toBe(true);
    expect(error.name).toBe('BudgetExceededError');
  });

  it('should create BudgetExceededError without guardrailId', () => {
    const error = new BudgetExceededError();
    expect(error.guardrailId).toBeUndefined();
  });

  it('should create ValidationError', () => {
    const error = new ValidationError('Invalid config', 'gr-val');
    expect(error.message).toBe('Invalid config');
    expect(error.type).toBe(GuardrailErrorType.VALIDATION_FAILED);
    expect(error.guardrailId).toBe('gr-val');
    expect(error.recoverable).toBe(false);
    expect(error.name).toBe('ValidationError');
  });
});
