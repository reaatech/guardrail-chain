import type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';

interface CostPrecheckConfig {
  maxTokens?: number;
  maxCharacters?: number;
}

/**
 * Estimate and validate token/cost budgets before LLM call.
 * Uses a simple heuristic: ~4 characters per token.
 */
export class CostPrecheck implements Guardrail<string, string> {
  readonly id = 'cost-precheck';
  readonly name = 'Cost Precheck';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 1000;

  constructor(private config: CostPrecheckConfig = {}) {}

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      if (typeof input !== 'string') {
        return {
          passed: false,
          metadata: { duration: Date.now() - startTime },
          error: new Error('Invalid input: expected string'),
        };
      }

      const maxTokens = this.config.maxTokens ?? context.budget.remainingTokens;
      const maxChars = this.config.maxCharacters;
      const estimatedTokens = Math.ceil(input.length / 4);
      const passed =
        estimatedTokens <= maxTokens && (maxChars === undefined || input.length <= maxChars);

      return {
        passed,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          estimatedTokens,
          maxTokens,
          inputLength: input.length,
        },
      };
    } catch (error) {
      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
