import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface PIIRedactionConfig {
  redactionStrategy?: 'mask' | 'remove';
  customPatterns?: Array<{
    pattern: RegExp;
    replacement: string;
    validator?: (match: string) => boolean;
  }>;
}

function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number.parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const DEFAULT_PATTERNS: Array<{
  pattern: RegExp;
  replacement: string;
  validator?: (match: string) => boolean;
}> = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE_NUMBER]' },
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[SSN_OR_ID_NUMBER]' },
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[CREDIT_CARD_NUMBER]',
    validator: luhnCheck,
  },
];

/**
 * Detect and redact personally identifiable information.
 */
export class PIIRedaction implements Guardrail<string, string> {
  readonly id = 'pii-redaction';
  readonly name = 'PII Redaction';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 5000;

  constructor(private config: PIIRedactionConfig = {}) {}

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

      const strategy = this.config.redactionStrategy ?? 'mask';
      const patterns = [...DEFAULT_PATTERNS, ...(this.config.customPatterns ?? [])];
      let output = input;
      let redactions = 0;

      for (const { pattern, replacement, validator } of patterns) {
        const matches = output.match(pattern);
        if (matches) {
          const validMatches = validator ? matches.filter(validator) : matches;
          if (validMatches.length > 0) {
            redactions += validMatches.length;
            if (strategy === 'remove') {
              for (const match of validMatches) {
                output = output.replace(match, '');
              }
            } else {
              for (const match of validMatches) {
                output = output.replace(match, replacement);
              }
            }
          }
        }
      }

      return {
        passed: true,
        output,
        metadata: {
          duration: Date.now() - startTime,
          redactions,
          strategy,
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
