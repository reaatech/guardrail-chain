import type { BudgetConfig, BudgetState } from './types.js';

/**
 * Tracks and enforces latency and token budgets throughout chain execution.
 */
export class BudgetManager {
  private readonly totalLatencyBudget: number;
  private readonly totalTokenBudget: number;
  private usedLatency = 0;
  private usedTokens = 0;

  constructor(config: BudgetConfig) {
    this.totalLatencyBudget = config.maxLatencyMs;
    this.totalTokenBudget = config.maxTokens;
  }

  /**
   * Check if a guardrail with the given estimated cost can be executed
   * within the remaining budget.
   */
  canExecute(estimatedCostMs: number): boolean {
    return this.usedLatency + estimatedCostMs <= this.totalLatencyBudget;
  }

  /**
   * Record the actual cost of an execution.
   */
  recordExecution(duration: number, tokens?: number): void {
    this.usedLatency += duration;
    if (tokens !== undefined && tokens > 0) {
      this.usedTokens += tokens;
    }
  }

  /**
   * Get the current budget state.
   */
  getRemainingBudget(): BudgetState {
    return {
      remainingLatency: Math.max(0, this.totalLatencyBudget - this.usedLatency),
      remainingTokens: Math.max(0, this.totalTokenBudget - this.usedTokens),
      usedLatency: this.usedLatency,
      usedTokens: this.usedTokens,
    };
  }

  /**
   * Check if the total budget has been exceeded.
   */
  isExceeded(): boolean {
    return this.usedLatency > this.totalLatencyBudget || this.usedTokens > this.totalTokenBudget;
  }
}
