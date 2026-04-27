import type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';

interface HallucinationCheckConfig {
  threshold?: number;
  externalVerifier?: (text: string) => Promise<{ score: number }>;
}

/**
 * Template guardrail for factual consistency.
 * Ships with a lightweight heuristic. Real fact verification requires
 * an external API or secondary LLM call.
 */
export class HallucinationCheck implements Guardrail<string, string> {
  readonly id = 'hallucination-check';
  readonly name = 'Hallucination Check';
  readonly type = 'output' as const;
  enabled = true;
  timeout = 5000;

  constructor(private config: HallucinationCheckConfig = {}) {}

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

      const threshold = this.config.threshold ?? 0.7;
      let score = 0;

      // Heuristic: check for speculative language
      const speculativePatterns = [
        /\b(maybe|perhaps|possibly|might|could be|I think|I believe)\b/gi,
        /\b(unverified|unconfirmed|allegedly|reportedly)\b/gi,
      ];

      let speculativeCount = 0;
      for (const pattern of speculativePatterns) {
        const matches = input.match(pattern);
        if (matches) {
          speculativeCount += matches.length;
        }
      }

      score += speculativeCount * 0.15;

      // Heuristic: check for unqualified numbers/dates
      const unqualifiedNumbers = input.match(/\b\d{4,}\b/g);
      if (unqualifiedNumbers && unqualifiedNumbers.length > 3) {
        score += 0.1;
      }

      // Use external verifier if provided
      if (this.config.externalVerifier) {
        const external = await this.config.externalVerifier(input);
        score = Math.max(score, external.score);
      }

      score = Math.min(score, 1);
      const passed = score < threshold;

      return {
        passed,
        output: input,
        confidence: 1 - score,
        metadata: {
          duration: Date.now() - startTime,
          score,
          threshold,
          speculativeCount,
          heuristic: !this.config.externalVerifier,
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
