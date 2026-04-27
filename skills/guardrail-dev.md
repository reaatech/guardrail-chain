# Skill: Developing New Guardrails

This skill provides comprehensive guidance for developing new guardrails for the Guardrail Chain project.

## Guardrail Fundamentals

### What is a Guardrail?

A guardrail is an independent, testable unit that processes input or output in the AI/LLM pipeline. Each guardrail:

- Has a specific purpose (PII detection, toxicity filtering, etc.)
- Executes within defined latency/token budgets
- Returns a pass/fail result with optional transformation
- Can be composed with other guardrails in a chain

### Guardrail Types

1. **Input Guardrails**: Process user input before sending to LLM
2. **Output Guardrails**: Process LLM response before returning to user

## Core Interface

### Guardrail Interface

```typescript
interface Guardrail<TInput = unknown, TOutput = unknown> {
  /** Unique identifier for this guardrail */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Type of guardrail: input or output */
  readonly type: 'input' | 'output';

  /** Whether this guardrail is enabled */
  enabled: boolean;

  /** Timeout in milliseconds (optional) */
  timeout?: number;

  /**
   * Main execution method
   * @param input - The input to process
   * @param context - Chain context with budget and metadata
   * @returns Promise resolving to guardrail result
   */
  execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>>;

  /**
   * Optional: Validate configuration
   * @param config - Configuration to validate
   * @returns true if configuration is valid
   */
  validateConfig?(config: unknown): boolean;
}
```

### Guardrail Result Interface

```typescript
interface GuardrailResult<TOutput = unknown> {
  /** Whether the guardrail check passed */
  passed: boolean;

  /** Optional transformed output */
  output?: TOutput;

  /** Confidence score (0-1) if applicable */
  confidence?: number;

  /** Metadata about execution */
  metadata?: {
    /** Execution duration in milliseconds */
    duration: number;

    /** Tokens used (if applicable) */
    tokensUsed?: number;

    /** Additional custom metadata */
    [key: string]: unknown;
  };

  /** Error if execution failed */
  error?: Error;
}
```

## Implementation Patterns

### 1. Simple Validation Guardrail

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '../core/types.js';

export class LengthValidator implements Guardrail<string, string> {
  readonly id = 'length-validator';
  readonly name = 'Length Validator';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 1000;

  constructor(private config: LengthValidatorConfig = {}) {
    this.validateConfig(config);
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      const maxLength = this.config.maxLength || 1000;

      if (input.length > maxLength) {
        return {
          passed: false,
          output: input.substring(0, maxLength),
          confidence: 1.0,
          metadata: {
            duration: Date.now() - startTime,
            originalLength: input.length,
            truncatedLength: maxLength,
          },
        };
      }

      return {
        passed: true,
        output: input,
        confidence: 1.0,
        metadata: {
          duration: Date.now() - startTime,
          originalLength: input.length,
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

  validateConfig(config: unknown): boolean {
    if (typeof config !== 'object' || config === null) return true;

    const cfg = config as Record<string, unknown>;
    if (cfg.maxLength !== undefined && typeof cfg.maxLength !== 'number') {
      throw new Error('maxLength must be a number');
    }

    return true;
  }
}

interface LengthValidatorConfig {
  maxLength?: number;
}
```

### 2. Transformation Guardrail

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '../core/types.js';

export class TextNormalizer implements Guardrail<string, string> {
  readonly id = 'text-normalizer';
  readonly name = 'Text Normalizer';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 500;

  constructor(private config: TextNormalizerConfig = {}) {}

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      let normalized = input;

      // Remove extra whitespace
      if (this.config.trimWhitespace !== false) {
        normalized = normalized.trim().replace(/\s+/g, ' ');
      }

      // Convert to lowercase if configured
      if (this.config.lowercase) {
        normalized = normalized.toLowerCase();
      }

      // Remove special characters if configured
      if (this.config.removeSpecialChars) {
        normalized = normalized.replace(/[^\w\s]/g, '');
      }

      return {
        passed: true,
        output: normalized,
        confidence: 1.0,
        metadata: {
          duration: Date.now() - startTime,
          originalLength: input.length,
          normalizedLength: normalized.length,
          transformations: this.getAppliedTransformations(input, normalized),
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

  private getAppliedTransformations(original: string, normalized: string): string[] {
    const transformations: string[] = [];

    if (original.length !== normalized.length) {
      transformations.push('length_changed');
    }

    if (original !== original.trim()) {
      transformations.push('trimmed');
    }

    if (original.toLowerCase() === normalized) {
      transformations.push('lowercased');
    }

    return transformations;
  }
}

interface TextNormalizerConfig {
  trimWhitespace?: boolean;
  lowercase?: boolean;
  removeSpecialChars?: boolean;
}
```

### 3. External API Guardrail

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '../core/types.js';

export class ToxicityDetector implements Guardrail<string, string> {
  readonly id = 'toxicity-detector';
  readonly name = 'Toxicity Detector';
  readonly type = 'output' as const;
  enabled = true;
  timeout = 3000;

  constructor(
    private config: ToxicityDetectorConfig,
    private apiClient: ToxicityAPIClient,
  ) {
    this.validateConfig(config);
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    try {
      // Check budget before making API call
      if (context.budget.remainingLatency < 500) {
        return {
          passed: true,
          output: input,
          metadata: {
            duration: Date.now() - startTime,
            skipped: true,
            reason: 'budget_insufficient',
          },
        };
      }

      // Call external API
      const response = await this.apiClient.analyze(input, {
        timeout: this.timeout,
        languages: this.config.languages,
      });

      const toxicityScore = response.toxicityScore;
      const isToxic = toxicityScore > this.config.threshold;

      return {
        passed: !isToxic,
        output: isToxic ? this.sanitizeOutput(input) : input,
        confidence: 1 - toxicityScore,
        metadata: {
          duration: Date.now() - startTime,
          toxicityScore,
          categories: response.categories,
          threshold: this.config.threshold,
          tokensUsed: response.tokensUsed,
        },
      };
    } catch (error) {
      // On API error, fail open or closed based on config
      if (this.config.failOpen) {
        return {
          passed: true,
          output: input,
          metadata: {
            duration: Date.now() - startTime,
            error: 'api_error',
            failOpen: true,
          },
        };
      }

      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private sanitizeOutput(input: string): string {
    return '[Content flagged as potentially toxic]';
  }

  validateConfig(config: unknown): boolean {
    if (typeof config !== 'object' || config === null) return false;

    const cfg = config as Record<string, unknown>;

    if (cfg.threshold !== undefined) {
      if (typeof cfg.threshold !== 'number' || cfg.threshold < 0 || cfg.threshold > 1) {
        throw new Error('threshold must be a number between 0 and 1');
      }
    }

    return true;
  }
}

interface ToxicityDetectorConfig {
  threshold?: number;
  languages?: string[];
  failOpen?: boolean;
}

interface ToxicityAPIClient {
  analyze(text: string, options?: unknown): Promise<ToxicityResponse>;
}

interface ToxicityResponse {
  toxicityScore: number;
  categories: string[];
  tokensUsed: number;
}
```

### 4. Caching Guardrail

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '../core/types.js';

export class CachedGuardrail<TInput, TOutput> implements Guardrail<TInput, TOutput> {
  readonly id: string;
  readonly name: string;
  readonly type: 'input' | 'output';
  enabled = true;
  timeout?: number;

  private cache: Map<string, GuardrailResult<TOutput>>;
  private ttl: number;

  constructor(
    private wrappedGuardrail: Guardrail<TInput, TOutput>,
    config: CachedGuardrailConfig = {},
  ) {
    this.id = `cached-${wrappedGuardrail.id}`;
    this.name = `Cached ${wrappedGuardrail.name}`;
    this.type = wrappedGuardrail.type;
    this.timeout = wrappedGuardrail.timeout;
    this.cache = new Map();
    this.ttl = config.ttl || 3600000; // Default 1 hour
  }

  async execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input);

    // Check cache
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        metadata: {
          ...cachedResult.metadata,
          duration: Date.now() - startTime,
          fromCache: true,
        },
      };
    }

    // Execute wrapped guardrail
    const result = await this.wrappedGuardrail.execute(input, context);

    // Cache successful results
    if (result.passed) {
      this.cache.set(cacheKey, result);

      // Clean old entries periodically
      if (Math.random() < 0.1) {
        // 10% chance
        this.cleanExpiredEntries();
      }
    }

    return {
      ...result,
      metadata: {
        ...result.metadata,
        duration: Date.now() - startTime,
        fromCache: false,
      },
    };
  }

  private generateCacheKey(input: TInput): string {
    // Simple hash based on input string representation
    const inputStr = JSON.stringify(input);
    return `${this.wrappedGuardrail.id}:${this.hashCode(inputStr)}`;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, result] of this.cache.entries()) {
      if (result.metadata && result.metadata.duration) {
        const age = now - result.metadata.duration;
        if (age > this.ttl) {
          this.cache.delete(key);
        }
      }
    }
  }
}

interface CachedGuardrailConfig {
  ttl?: number;
}
```

## Best Practices

### 1. Error Handling

```typescript
// ✅ Good - comprehensive error handling
async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!input || typeof input !== 'string') {
      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: new Error('Invalid input: expected non-empty string')
      };
    }

    // Check budget
    if (context.budget.remainingLatency < 100) {
      return {
        passed: true,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          skipped: true,
          reason: 'budget_insufficient'
        }
      };
    }

    // Main logic
    const result = await this.processInput(input);

    return {
      passed: true,
      output: result,
      metadata: { duration: Date.now() - startTime }
    };
  } catch (error) {
    return {
      passed: false,
      metadata: { duration: Date.now() - startTime },
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// ❌ Bad - no error handling
async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
  const result = await this.processInput(input);
  return { passed: true, output: result };
}
```

### 2. Performance Optimization

```typescript
// ✅ Good - optimized
export class OptimizedGuardrail implements Guardrail<string, string> {
  private readonly pattern: RegExp;
  private readonly cache: LRUCache<string, boolean>;

  constructor(config: Config) {
    // Pre-compile regex patterns
    this.pattern = new RegExp(config.pattern, 'gi');
    this.cache = new LRUCache({ max: 1000 });
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    // Check cache first
    const cachedResult = this.cache.get(input);
    if (cachedResult !== undefined) {
      return {
        passed: cachedResult,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          fromCache: true,
        },
      };
    }

    // Early exit for empty input
    if (!input) {
      return { passed: true, output: '', metadata: { duration: Date.now() - startTime } };
    }

    // Process with optimized algorithm
    const result = this.pattern.test(input);
    this.cache.set(input, result);

    return {
      passed: result,
      output: input,
      metadata: { duration: Date.now() - startTime },
    };
  }
}
```

### 3. Configuration Validation

```typescript
// ✅ Good - robust validation
class ConfigurableGuardrail implements Guardrail<string, string> {
  constructor(config: GuardrailConfig) {
    this.validateConfig(config);
    this.config = this.normalizeConfig(config);
  }

  private validateConfig(config: unknown): asserts config is GuardrailConfig {
    if (typeof config !== 'object' || config === null) {
      throw new Error('Configuration must be an object');
    }

    const cfg = config as Record<string, unknown>;

    if (cfg.threshold !== undefined) {
      if (typeof cfg.threshold !== 'number') {
        throw new Error('threshold must be a number');
      }
      if (cfg.threshold < 0 || cfg.threshold > 1) {
        throw new Error('threshold must be between 0 and 1');
      }
    }

    if (cfg.patterns !== undefined) {
      if (!Array.isArray(cfg.patterns)) {
        throw new Error('patterns must be an array');
      }
      cfg.patterns.forEach((pattern: unknown, index: number) => {
        if (typeof pattern !== 'string') {
          throw new Error(`patterns[${index}] must be a string`);
        }
      });
    }
  }

  private normalizeConfig(config: GuardrailConfig): NormalizedConfig {
    return {
      threshold: config.threshold ?? 0.5,
      patterns: config.patterns ?? [],
      timeout: config.timeout ?? 5000,
    };
  }
}
```

### 4. Logging and Observability

```typescript
import { getLogger } from '../observability/logger.js';

export class ObservableGuardrail implements Guardrail<string, string> {
  private logger = getLogger('observable-guardrail');

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();

    this.logger.debug({
      event: 'guardrail_start',
      guardrailId: this.id,
      correlationId: context.correlationId,
      inputLength: input.length,
    });

    try {
      const result = await this.process(input);

      this.logger.info({
        event: 'guardrail_complete',
        guardrailId: this.id,
        correlationId: context.correlationId,
        passed: result.passed,
        duration: Date.now() - startTime,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      this.logger.error({
        event: 'guardrail_error',
        guardrailId: this.id,
        correlationId: context.correlationId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });

      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
```

## Testing Guardrails

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyGuardrail } from '../src/guardrails/input/my-guardrail.js';

describe('MyGuardrail', () => {
  let guardrail: MyGuardrail;
  let mockContext: ChainContext;

  beforeEach(() => {
    guardrail = new MyGuardrail();
    mockContext = createMockContext();
  });

  describe('execute', () => {
    it('should pass valid input', async () => {
      const input = 'valid input';

      const result = await guardrail.execute(input, mockContext);

      expect(result.passed).toBe(true);
      expect(result.output).toBe(input);
      expect(result.metadata?.duration).toBeLessThan(100);
    });

    it('should fail invalid input', async () => {
      const input = 'invalid input';

      const result = await guardrail.execute(input, mockContext);

      expect(result.passed).toBe(false);
    });

    it('should handle empty input', async () => {
      const input = '';

      const result = await guardrail.execute(input, mockContext);

      expect(result.passed).toBe(true);
      expect(result.output).toBe('');
    });

    it('should respect timeout', async () => {
      const slowGuardrail = new MyGuardrail({ timeout: 100 });
      const input = 'test';

      const result = await slowGuardrail.execute(input, mockContext);

      expect(result.passed).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle errors gracefully', async () => {
      const input = null as unknown;

      const result = await guardrail.execute(input, mockContext);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('should accept valid configuration', () => {
      expect(() => new MyGuardrail({ threshold: 0.5 })).not.toThrow();
    });

    it('should reject invalid configuration', () => {
      expect(() => new MyGuardrail({ threshold: 1.5 })).toThrow();
    });
  });
});
```

## Registration and Export

### Export Pattern

```typescript
// src/guardrails/input/index.ts
export { PIIRedaction } from './pii-redaction.js';
export { PromptInjection } from './prompt-injection.js';
export { TopicBoundary } from './topic-boundary.js';
export { MyGuardrail } from './my-guardrail.js';

// Re-export types
export type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';
```

### Factory Registration

```typescript
// src/guardrails/factory.ts
import type { Guardrail } from '../core/types.js';
import { PIIRedaction } from './input/pii-redaction.js';
import { MyGuardrail } from './input/my-guardrail.js';

const guardrailRegistry = new Map<string, (config?: unknown) => Guardrail>();

export function registerGuardrails(): void {
  guardrailRegistry.set('pii-redaction', (config) => new PIIRedaction(config));
  guardrailRegistry.set('my-guardrail', (config) => new MyGuardrail(config));
}

export function createGuardrail(id: string, config?: unknown): Guardrail {
  const factory = guardrailRegistry.get(id);
  if (!factory) {
    throw new Error(`Unknown guardrail: ${id}`);
  }
  return factory(config);
}
```

## Performance Guidelines

### Latency Targets

| Guardrail Type    | Target Latency | Max Latency |
| ----------------- | -------------- | ----------- |
| Simple validation | < 5ms          | < 10ms      |
| Pattern matching  | < 20ms         | < 50ms      |
| External API call | < 200ms        | < 500ms     |
| Complex ML model  | < 100ms        | < 200ms     |

### Memory Considerations

- Avoid storing large amounts of data in memory
- Use streaming for large inputs
- Implement proper cleanup in finally blocks
- Consider memory usage in caching strategies

### Budget Awareness

```typescript
async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
  const startTime = Date.now();

  // Check if we have enough budget
  const estimatedCost = this.estimateCost(input);
  if (context.budget.remainingLatency < estimatedCost) {
    return {
      passed: true,
      output: input,
      metadata: {
        duration: Date.now() - startTime,
        skipped: true,
        reason: 'budget_insufficient'
      }
    };
  }

  // Execute with budget tracking
  try {
    const result = await this.process(input);

    // Record actual cost
    context.budget.recordExecution(Date.now() - startTime);

    return result;
  } catch (error) {
    return {
      passed: false,
      metadata: { duration: Date.now() - startTime },
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
```

## Related Skills

- [Testing Strategies](testing.md) — How to test guardrails comprehensively
- [TypeScript Best Practices](typescript-dev.md) — Strict typing, type guards, and patterns
- [Performance Guidelines](performance.md) — Caching, lazy loading, and latency budgets
- [Security Best Practices](security.md) — Input validation, PII protection, and fail-secure patterns
- [Documentation](documentation.md) — JSDoc, README updates, and changelog maintenance

## Resources

- **Core Types**: `src/core/types.ts`
- **Example Guardrails**: `src/guardrails/`
- **Testing Guide**: `skills/testing.md`
- **Performance Guide**: `skills/performance.md`

---

_Last updated: 2026-04-22_
