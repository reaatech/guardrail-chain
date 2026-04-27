import type { Guardrail, BudgetConfig, ErrorHandlingConfig, ObservabilityConfig } from './types.js';
import { GuardrailChain } from './chain.js';

/**
 * Fluent builder for constructing GuardrailChain instances.
 *
 * @example
 * ```typescript
 * const chain = new ChainBuilder()
 *   .withBudget({ maxLatencyMs: 500, maxTokens: 4000 })
 *   .withGuardrail(new PIIRedaction())
 *   .withGuardrail(new ToxicityFilter())
 *   .build();
 * ```
 */
export class ChainBuilder {
  private guardrails: Guardrail[] = [];
  private budget: BudgetConfig = { maxLatencyMs: 1000, maxTokens: 4000 };
  private skipSlowGuardrails = true;
  private errorHandling?: ErrorHandlingConfig;
  private observability?: ObservabilityConfig;

  withBudget(budget: BudgetConfig): this {
    this.budget = budget;
    return this;
  }

  withSlowGuardrailSkipping(enabled: boolean): this {
    this.skipSlowGuardrails = enabled;
    return this;
  }

  withGuardrail(guardrail: Guardrail): this {
    this.guardrails.push(guardrail);
    return this;
  }

  withGuardrails(guardrails: Guardrail[]): this {
    for (const g of guardrails) {
      this.guardrails.push(g);
    }
    return this;
  }

  withErrorHandling(config: ErrorHandlingConfig): this {
    this.errorHandling = config;
    return this;
  }

  withObservability(config: ObservabilityConfig): this {
    this.observability = config;
    return this;
  }

  build(): GuardrailChain {
    const chain = new GuardrailChain({
      budget: {
        ...this.budget,
        skipSlowGuardrailsUnderPressure: this.skipSlowGuardrails,
      },
      errorHandling: this.errorHandling,
      observability: this.observability,
    });

    for (const g of this.guardrails) {
      chain.addGuardrail(g);
    }

    return chain;
  }
}
