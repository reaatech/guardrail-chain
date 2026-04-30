import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface SentimentAnalysisConfig {
  threshold?: number;
  allowNegative?: boolean;
}

const POSITIVE_WORDS = [
  'good',
  'great',
  'excellent',
  'amazing',
  'wonderful',
  'fantastic',
  'love',
  'happy',
  'best',
  'awesome',
  'perfect',
  'beautiful',
];

const NEGATIVE_WORDS = [
  'bad',
  'terrible',
  'awful',
  'horrible',
  'hate',
  'worst',
  'disgusting',
  'pathetic',
  'disappointing',
  'sad',
  'angry',
];

/**
 * Monitor emotional tone of output.
 */
export class SentimentAnalysis implements Guardrail<string, string> {
  readonly id = 'sentiment-analysis';
  readonly name = 'Sentiment Analysis';
  readonly type = 'output' as const;
  enabled = true;
  timeout = 1000;

  constructor(private config: SentimentAnalysisConfig = {}) {}

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

      const lower = input.toLowerCase();
      const words = lower.split(/\s+/);

      let positive = 0;
      let negative = 0;

      for (const word of words) {
        if (POSITIVE_WORDS.includes(word)) positive++;
        if (NEGATIVE_WORDS.includes(word)) negative++;
      }

      const total = positive + negative;
      const score = total === 0 ? 0 : (positive - negative) / total;
      const threshold = this.config.threshold ?? -0.5;
      // When `allowNegative` is explicitly true, every score is accepted;
      // otherwise we fall through to the threshold check.
      const passed = this.config.allowNegative === true ? true : score >= threshold;

      return {
        passed,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          score,
          positive,
          negative,
          threshold,
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
