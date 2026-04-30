import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';
import { LRUCache } from '@reaatech/guardrail-chain';
import { hashString } from '@reaatech/guardrail-chain';

interface CachedGuardrailConfig {
  ttlMs?: number;
  maxSize?: number;
  /**
   * Stable fingerprint for the wrapped guardrail's configuration.
   * Include this when multiple `CachedGuardrail` instances wrap the same
   * underlying guardrail with different configs — otherwise their cache
   * keys would collide if the caches are ever shared.
   */
  configFingerprint?: string;
}

/**
 * Wrapper that caches successful guardrail results.
 *
 * Cache key is `<guardrail-id>:<config-fingerprint>:<input-hash>`. The cache
 * is per-instance and in-memory only — it is not safe to share across
 * processes without a remote backend.
 */
export class CachedGuardrail<TInput, TOutput> implements Guardrail<TInput, TOutput> {
  readonly id: string;
  readonly name: string;
  readonly type: 'input' | 'output';
  enabled = true;
  timeout?: number;
  essential?: boolean;
  priority?: number;
  estimatedCostMs?: number;
  shortCircuitOnFail?: boolean;
  validateConfig?: (config: unknown) => boolean;

  private cache: LRUCache<string, GuardrailResult<TOutput>>;
  private readonly configFingerprint: string;

  constructor(
    private wrappedGuardrail: Guardrail<TInput, TOutput>,
    config: CachedGuardrailConfig = {},
  ) {
    this.id = `cached-${wrappedGuardrail.id}`;
    this.name = `Cached ${wrappedGuardrail.name}`;
    this.type = wrappedGuardrail.type;
    this.timeout = wrappedGuardrail.timeout;
    this.essential = wrappedGuardrail.essential;
    this.shortCircuitOnFail = wrappedGuardrail.shortCircuitOnFail;
    this.priority = wrappedGuardrail.priority;
    this.estimatedCostMs = wrappedGuardrail.estimatedCostMs;
    this.validateConfig = wrappedGuardrail.validateConfig
      ? (config: unknown) => wrappedGuardrail.validateConfig?.(config) ?? false
      : undefined;
    this.configFingerprint = config.configFingerprint ?? 'default';
    this.cache = new LRUCache<string, GuardrailResult<TOutput>>({
      maxSize: config.maxSize ?? 1000,
      ttlMs: config.ttlMs ?? 3600000,
    });
  }

  async execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          duration: cached.metadata?.duration ?? 0,
          cacheAccessDuration: Date.now() - startTime,
          fromCache: true,
        },
      };
    }

    const result = await this.wrappedGuardrail.execute(input, context);

    if (result.passed) {
      this.cache.set(cacheKey, result);
    }

    return {
      ...result,
      metadata: {
        ...result.metadata,
        duration: result.metadata?.duration ?? 0,
        cacheAccessDuration: Date.now() - startTime,
        fromCache: false,
      },
    };
  }

  private generateCacheKey(input: TInput): string {
    const inputHash = hashString(JSON.stringify(input));
    return `${this.wrappedGuardrail.id}:${this.configFingerprint}:${inputHash}`;
  }
}
