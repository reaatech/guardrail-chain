/**
 * Custom error types for the Guardrail Chain framework.
 */

export enum GuardrailErrorType {
  TIMEOUT = 'TIMEOUT',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export class GuardrailError extends Error {
  constructor(
    message: string,
    public readonly type: GuardrailErrorType,
    public readonly guardrailId?: string,
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = 'GuardrailError';
  }
}

export class TimeoutError extends GuardrailError {
  constructor(guardrailId: string) {
    super(`Guardrail ${guardrailId} timed out`, GuardrailErrorType.TIMEOUT, guardrailId, true);
    this.name = 'TimeoutError';
  }
}

export class BudgetExceededError extends GuardrailError {
  constructor(guardrailId?: string) {
    super(
      'Budget exceeded during guardrail execution',
      GuardrailErrorType.BUDGET_EXCEEDED,
      guardrailId,
      true,
    );
    this.name = 'BudgetExceededError';
  }
}

export class ValidationError extends GuardrailError {
  constructor(message: string, guardrailId?: string) {
    super(message, GuardrailErrorType.VALIDATION_FAILED, guardrailId, false);
    this.name = 'ValidationError';
  }
}
