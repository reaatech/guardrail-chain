import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface LanguageDetectorConfig {
  allowedLanguages?: string[];
  blockedLanguages?: string[];
}

// Simple keyword fingerprints for common languages
const LANGUAGE_FINGERPRINTS: Record<string, string[]> = {
  en: ['the', 'and', 'is', 'to', 'of', 'a', 'in', 'that', 'have', 'it'],
  es: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se'],
  fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'en', 'avoir', 'pour'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
  zh: ['的', '是', '在', '和', '了', '有', '我', '不', '人', '们'],
  ja: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し'],
};

/**
 * Ensure input/output language compliance.
 */
export class LanguageDetector implements Guardrail<string, string> {
  readonly id = 'language-detector';
  readonly name = 'Language Detector';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 1000;

  constructor(private config: LanguageDetectorConfig = {}) {}

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

      const detected = this.detectLanguage(input);
      const allowed = this.config.allowedLanguages;
      const blocked = this.config.blockedLanguages ?? [];

      let passed = true;
      const violations: string[] = [];

      if (blocked.includes(detected)) {
        passed = false;
        violations.push(detected);
      }

      if (allowed && allowed.length > 0 && !allowed.includes(detected)) {
        passed = false;
        violations.push(detected);
      }

      return {
        passed,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          detectedLanguage: detected,
          violations,
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

  private detectLanguage(input: string): string {
    // CJK scripts don't use word spacing, so fall back to character-class
    // detection for those. Hiragana / katakana -> ja (winning over shared
    // Han ideographs); Han-only -> zh.
    const hiragana = /[぀-ゟ]/.test(input);
    const katakana = /[゠-ヿ]/.test(input);
    const hanOnly = /[一-鿿]/.test(input);
    if (hiragana || katakana) return 'ja';
    if (hanOnly) return 'zh';

    const lower = input.toLowerCase();
    const words = lower.split(/\s+/);
    const scores: Record<string, number> = {};

    for (const [lang, fingerprints] of Object.entries(LANGUAGE_FINGERPRINTS)) {
      if (lang === 'zh' || lang === 'ja') continue;
      scores[lang] = 0;
      for (const word of words) {
        if (fingerprints.includes(word)) {
          scores[lang]++;
        }
      }
    }

    let bestLang = 'unknown';
    let bestScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }
}
