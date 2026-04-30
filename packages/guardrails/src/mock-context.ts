import type { BudgetState, ChainContext } from '@reaatech/guardrail-chain';

export function createMockContext(overrides?: Partial<ChainContext>): ChainContext {
  const defaultBudget: BudgetState = {
    remainingLatency: 1000,
    remainingTokens: 4000,
    usedLatency: 0,
    usedTokens: 0,
  };

  return {
    correlationId: `test-${Date.now()}`,
    budget: defaultBudget,
    metadata: {},
    transformedInput: null,
    originalInput: null,
    ...overrides,
  };
}
