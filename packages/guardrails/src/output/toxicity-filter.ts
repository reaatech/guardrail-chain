import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface ToxicityFilterConfig {
  threshold?: number;
  categories?: string[];
}

const TOXIC_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(hate|stupid|idiot|moron|dumb|worthless|loser)\b/gi, category: 'insult' },
  { pattern: /\b(kill|die|death|murder)\b/gi, category: 'violence' },
  { pattern: /\b(attack|harm|hurt|destroy)\b/gi, category: 'violence' },
  { pattern: /\b(racist|racism|sexist|sexism|homophobic)\b/gi, category: 'hate' },
  { pattern: /\b(shut up|screw you|damn|hell)\b/gi, category: 'profanity' },
];

/**
 * Detect harmful, offensive, or inappropriate content via a word-list regex.
 *
 * This is a lightweight heuristic, not a production moderation classifier.
 * It will false-positive on benign phrases containing trigger words
 * (e.g. "killer app", "hell of a deal") and false-negative on anything
 * obfuscated or context-dependent. For higher-stakes use cases wrap a
 * hosted moderation API (e.g. OpenAI, Perspective) in a custom guardrail
 * that implements the same `Guardrail` interface.
 */
export class ToxicityFilter implements Guardrail<string, string> {
  readonly id = 'toxicity-filter';
  readonly name = 'Toxicity Filter';
  readonly type = 'output' as const;
  enabled = true;
  timeout = 3000;

  constructor(private config: ToxicityFilterConfig = {}) {}

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
      const allowedCategories = this.config.categories;
      let score = 0;
      const detectedCategories: string[] = [];

      for (const { pattern, category } of TOXIC_PATTERNS) {
        if (allowedCategories && !allowedCategories.includes(category)) {
          continue;
        }

        const matches = input.match(pattern);
        if (matches) {
          score += matches.length * 0.2;
          if (!detectedCategories.includes(category)) {
            detectedCategories.push(category);
          }
        }
      }

      score = Math.min(score, 1);
      const passed = score < threshold;

      return {
        passed,
        output: passed ? input : '[Content flagged as potentially toxic]',
        confidence: 1 - score,
        metadata: {
          duration: Date.now() - startTime,
          score,
          threshold,
          detectedCategories,
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
