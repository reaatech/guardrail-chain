import { describe, it, expect } from 'vitest';
import {
  PIIRedaction,
  PromptInjection,
  TopicBoundary,
  CostPrecheck,
  RateLimiter,
  LanguageDetector,
  ContentModeration,
  MemoryLimit,
  PIIScan,
  HallucinationCheck,
  ToxicityFilter,
  SentimentAnalysis,
  CachedGuardrail,
} from '../../../src/guardrails/index.js';

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
