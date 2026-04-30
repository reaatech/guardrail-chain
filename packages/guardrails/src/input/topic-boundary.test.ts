import { describe, expect, it } from 'vitest';
import { createMockContext } from '../mock-context.js';
import { TopicBoundary } from './topic-boundary.js';

describe('TopicBoundary', () => {
  const context = createMockContext();

  it('should pass when no restrictions are set', async () => {
    const guardrail = new TopicBoundary();
    const result = await guardrail.execute('Anything goes', context);
    expect(result.passed).toBe(true);
  });

  it('should block forbidden topics', async () => {
    const guardrail = new TopicBoundary({ blockedTopics: ['politics', 'religion'] });
    const result = await guardrail.execute('What do you think about politics?', context);
    expect(result.passed).toBe(false);
    expect(result.metadata?.violations).toContain('politics');
  });

  it('should allow non-blocked topics', async () => {
    const guardrail = new TopicBoundary({ blockedTopics: ['politics'] });
    const result = await guardrail.execute('Tell me about cats', context);
    expect(result.passed).toBe(true);
  });

  it('should enforce allowed topics list', async () => {
    const guardrail = new TopicBoundary({ allowedTopics: ['science', 'math'] });
    const passResult = await guardrail.execute('Explain quantum science', context);
    expect(passResult.passed).toBe(true);

    const failResult = await guardrail.execute('Tell me a joke', context);
    expect(failResult.passed).toBe(false);
  });

  it('should handle empty input', async () => {
    const guardrail = new TopicBoundary();
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
  });

  it('should reject non-string input', async () => {
    const guardrail = new TopicBoundary();
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});
