import type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';

interface PromptInjectionConfig {
  sensitivity?: 'low' | 'medium' | 'high';
  customPatterns?: string[];
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?prior\s+instructions/gi,
  /you\s+are\s+now\s+in\s+(developer|debug|admin)\s+mode/gi,
  /bypass\s+(all\s+)?(safety\s+|security\s+)?(filters|restrictions)/gi,
  /output\s+your\s+(system\s+)?prompt/gi,
  /print\s+your\s+(system\s+)?instructions/gi,
  /repeat\s+(the\s+words\s+)?above/gi,
  /repeat\s+(the\s+words\s+)?back/gi,
  /DAN\s*\(Do\s*Anything\s*Now\)/gi,
  /jailbreak/gi,
];

/**
 * Identify common injection patterns and jailbreak attempts.
 */
export class PromptInjection implements Guardrail<string, string> {
  readonly id = 'prompt-injection';
  readonly name = 'Prompt Injection Detection';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 3000;

  constructor(private config: PromptInjectionConfig = {}) {}

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

      const sensitivity = this.config.sensitivity ?? 'medium';
      const threshold = sensitivity === 'low' ? 3 : sensitivity === 'high' ? 1 : 2;

      const patterns = [...INJECTION_PATTERNS];
      if (this.config.customPatterns) {
        for (const p of this.config.customPatterns) {
          patterns.push(new RegExp(p, 'gi'));
        }
      }

      let matches = 0;
      const matchedPatterns: string[] = [];

      for (const pattern of patterns) {
        const m = input.match(pattern);
        if (m) {
          matches += m.length;
          matchedPatterns.push(pattern.source.substring(0, 30));
        }
      }

      const passed = matches < threshold;

      return {
        passed,
        output: input,
        confidence: passed ? 1 - matches * 0.1 : Math.min(matches * 0.2, 1),
        metadata: {
          duration: Date.now() - startTime,
          matches,
          matchedPatterns: matchedPatterns.slice(0, 5),
          sensitivity,
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
