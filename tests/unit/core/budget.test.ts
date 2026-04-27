import { describe, it, expect } from 'vitest';
import { BudgetManager } from '../../../src/core/budget.js';

describe('BudgetManager', () => {
  it('should allow execution within budget', () => {
    const budget = new BudgetManager({ maxLatencyMs: 1000, maxTokens: 4000 });
    expect(budget.canExecute(500)).toBe(true);
    expect(budget.canExecute(1000)).toBe(true);
  });

  it('should deny execution over budget', () => {
    const budget = new BudgetManager({ maxLatencyMs: 100, maxTokens: 1000 });
    expect(budget.canExecute(150)).toBe(false);
  });

  it('should track latency usage', () => {
    const budget = new BudgetManager({ maxLatencyMs: 1000, maxTokens: 4000 });
    budget.recordExecution(200);
    expect(budget.getRemainingBudget().remainingLatency).toBe(800);
    budget.recordExecution(300);
    expect(budget.getRemainingBudget().remainingLatency).toBe(500);
  });

  it('should track token usage', () => {
    const budget = new BudgetManager({ maxLatencyMs: 1000, maxTokens: 4000 });
    budget.recordExecution(0, 100);
    expect(budget.getRemainingBudget().remainingTokens).toBe(3900);
    budget.recordExecution(0, 200);
    expect(budget.getRemainingBudget().remainingTokens).toBe(3700);
  });

  it('should report budget exceeded', () => {
    const budget = new BudgetManager({ maxLatencyMs: 100, maxTokens: 1000 });
    budget.recordExecution(150);
    expect(budget.isExceeded()).toBe(true);
  });

  it('should not report exceeded when within budget', () => {
    const budget = new BudgetManager({ maxLatencyMs: 1000, maxTokens: 4000 });
    budget.recordExecution(100, 500);
    expect(budget.isExceeded()).toBe(false);
  });
});
