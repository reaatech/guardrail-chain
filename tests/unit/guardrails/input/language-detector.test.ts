import { describe, it, expect } from 'vitest';
import { LanguageDetector } from '../../../../src/guardrails/input/language-detector.js';
import { createMockContext } from '../../../utils/mock-context.js';

describe('LanguageDetector', () => {
  const context = createMockContext();

  it('should detect English', async () => {
    const guardrail = new LanguageDetector();
    const result = await guardrail.execute('The quick brown fox', context);
    expect(result.passed).toBe(true);
    expect(result.metadata?.detectedLanguage).toBe('en');
  });

  it('should block disallowed languages', async () => {
    const guardrail = new LanguageDetector({ blockedLanguages: ['es'] });
    const result = await guardrail.execute('El gato negro', context);
    expect(result.passed).toBe(false);
    expect(result.metadata?.detectedLanguage).toBe('es');
  });

  it('should enforce allowed languages', async () => {
    const guardrail = new LanguageDetector({ allowedLanguages: ['en'] });
    const passResult = await guardrail.execute('The cat is in the house', context);
    expect(passResult.passed).toBe(true);

    const failResult = await guardrail.execute('El mundo', context);
    expect(failResult.passed).toBe(false);
  });

  it('should handle empty input', async () => {
    const guardrail = new LanguageDetector();
    const result = await guardrail.execute('', context);
    expect(result.passed).toBe(true);
  });

  it('should reject non-string input', async () => {
    const guardrail = new LanguageDetector();
    const result = await guardrail.execute(123 as unknown as string, context);
    expect(result.passed).toBe(false);
  });
});
