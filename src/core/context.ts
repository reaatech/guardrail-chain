import type { ChainContext, BudgetConfig } from './types.js';
import { BudgetManager } from './budget.js';
import { generateCorrelationId } from '../utils/helpers.js';

/**
 * Factory for creating ChainContext instances.
 */
export function createChainContext(
  input: unknown,
  budgetConfig: BudgetConfig,
  overrides?: Partial<ChainContext>,
): ChainContext {
  const budgetManager = new BudgetManager(budgetConfig);
  return {
    correlationId: overrides?.correlationId ?? generateCorrelationId(),
    userId: overrides?.userId,
    sessionId: overrides?.sessionId,
    budget: budgetManager.getRemainingBudget(),
    metadata: overrides?.metadata ?? {},
    transformedInput: input,
    originalInput: input,
    ...overrides,
  };
}
