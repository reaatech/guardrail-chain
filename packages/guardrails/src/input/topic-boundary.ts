import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface TopicBoundaryConfig {
  allowedTopics?: string[];
  blockedTopics?: string[];
  similarityThreshold?: number;
}

/**
 * Ensure input stays within allowed topics/domains.
 */
export class TopicBoundary implements Guardrail<string, string> {
  readonly id = 'topic-boundary';
  readonly name = 'Topic Boundary Check';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 3000;

  constructor(private config: TopicBoundaryConfig = {}) {}

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

      const blocked = this.config.blockedTopics ?? [];
      const allowed = this.config.allowedTopics;
      const lowerInput = input.toLowerCase();
      let passed = true;
      const violations: string[] = [];

      // Check blocked topics
      for (const topic of blocked) {
        if (lowerInput.includes(topic.toLowerCase())) {
          passed = false;
          violations.push(topic);
        }
      }

      // If allowed topics are specified, input must match at least one
      if (allowed && allowed.length > 0) {
        const hasAllowed = allowed.some((topic) => lowerInput.includes(topic.toLowerCase()));
        if (!hasAllowed) {
          passed = false;
          violations.push('no_allowed_topic');
        }
      }

      return {
        passed,
        output: input,
        confidence: passed ? 1 : 0.9,
        metadata: {
          duration: Date.now() - startTime,
          violations: violations.slice(0, 5),
          allowedTopics: allowed,
          blockedTopics: blocked,
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
