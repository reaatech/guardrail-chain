import { describe, expect, it } from 'vitest';
import {
  CachedGuardrail,
  ContentModeration,
  CostPrecheck,
  HallucinationCheck,
  LanguageDetector,
  MemoryLimit,
  PIIRedaction,
  PIIScan,
  PromptInjection,
  RateLimiter,
  SentimentAnalysis,
  TopicBoundary,
  ToxicityFilter,
} from './index.js';

describe('Guardrails index exports', () => {
  it('should export all input guardrails', () => {
    expect(PIIRedaction).toBeDefined();
    expect(PromptInjection).toBeDefined();
    expect(TopicBoundary).toBeDefined();
    expect(CostPrecheck).toBeDefined();
    expect(RateLimiter).toBeDefined();
    expect(LanguageDetector).toBeDefined();
    expect(ContentModeration).toBeDefined();
    expect(MemoryLimit).toBeDefined();
  });

  it('should export all output guardrails', () => {
    expect(PIIScan).toBeDefined();
    expect(HallucinationCheck).toBeDefined();
    expect(ToxicityFilter).toBeDefined();
    expect(SentimentAnalysis).toBeDefined();
  });

  it('should export guardrail wrappers', () => {
    expect(CachedGuardrail).toBeDefined();
  });
});
