import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface ContentModerationConfig {
  rules?: Array<{
    id: string;
    pattern: string;
    action: 'block' | 'flag' | 'warn';
    message?: string;
  }>;
}

/**
 * Custom rule-based content moderation.
 */
export class ContentModeration implements Guardrail<string, string> {
  readonly id = 'content-moderation';
  readonly name = 'Content Moderation';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 1000;

  private compiledRules: Array<{
    id: string;
    pattern: RegExp;
    action: 'block' | 'flag' | 'warn';
    message?: string;
  }>;

  constructor(config: ContentModerationConfig = {}) {
    this.compiledRules =
      config.rules?.map((r) => ({
        ...r,
        pattern: new RegExp(r.pattern, 'gi'),
      })) ?? [];
  }

  async execute(input: string, _context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      if (typeof input !== 'string') {
        return {
          passed: false,
          metadata: { duration: Date.now() - startTime },
          error: new Error('Invalid input: expected string'),
        };
      }

      const violations: Array<{ ruleId: string; action: string; message?: string }> = [];

      for (const rule of this.compiledRules) {
        if (rule.pattern.test(input)) {
          violations.push({
            ruleId: rule.id,
            action: rule.action,
            message: rule.message,
          });
        }
      }

      const blocked = violations.some((v) => v.action === 'block');

      return {
        passed: !blocked,
        output: blocked ? '[Content blocked by moderation rule]' : input,
        metadata: {
          duration: Date.now() - startTime,
          violations,
          rulesChecked: this.compiledRules.length,
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
