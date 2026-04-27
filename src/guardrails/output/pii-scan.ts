import { PIIRedaction } from '../input/pii-redaction.js';
import type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';

/**
 * Detect PII in LLM responses before showing to user.
 * Reuses the same patterns as PIIRedaction but with different default behavior.
 */
export class PIIScan implements Guardrail<string, string> {
  readonly id = 'pii-scan';
  readonly name = 'Output PII Scan';
  readonly type = 'output' as const;
  enabled = true;
  timeout = 5000;

  private redactor: PIIRedaction;

  constructor(config: { sensitivity?: 'low' | 'high' } = {}) {
    this.redactor = new PIIRedaction({
      redactionStrategy: config.sensitivity === 'high' ? 'remove' : 'mask',
    });
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    return this.redactor.execute(input, context);
  }
}
