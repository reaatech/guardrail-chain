import type { ChainContext, Guardrail, GuardrailResult } from '@reaatech/guardrail-chain';

interface RateLimiterConfig {
  windowMs?: number;
  maxRequests?: number;
  maxTrackedClients?: number;
}

/**
 * Sliding-window rate limiter keyed by `context.userId`, then `context.sessionId`,
 * then `'anonymous'`.
 *
 * State is kept in-process. Behind a load balancer each replica tracks its own
 * window, so effective limits are roughly `maxRequests * replicas`. For a
 * cluster-wide limit, back this with a shared store (Redis, etc.) by
 * subclassing or replacing this guardrail.
 */
export class RateLimiter implements Guardrail<string, string> {
  readonly id = 'rate-limiter';
  readonly name = 'Rate Limiter';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 1000;

  private readonly requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly maxTrackedClients: number;

  constructor(config: RateLimiterConfig = {}) {
    this.windowMs = config.windowMs ?? 60000;
    this.maxRequests = config.maxRequests ?? 100;
    this.maxTrackedClients = config.maxTrackedClients ?? 10000;
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const startTime = Date.now();
    const clientId = context.userId ?? context.sessionId ?? 'anonymous';
    const now = Date.now();

    const requestTimes = this.requests.get(clientId) ?? [];
    const recentRequests = requestTimes.filter((time) => now - time < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return {
        passed: false,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          rateLimited: true,
          clientId,
          windowMs: this.windowMs,
          maxRequests: this.maxRequests,
        },
      };
    }

    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    if (this.requests.size > this.maxTrackedClients) {
      this.evictOldestClient();
    }

    // Periodic cleanup
    if (Math.random() < 0.01) {
      this.cleanup(now);
    }

    return {
      passed: true,
      output: input,
      metadata: {
        duration: Date.now() - startTime,
        requestsInWindow: recentRequests.length,
      },
    };
  }

  private evictOldestClient(): void {
    const oldestKey = this.requests.keys().next().value;
    if (oldestKey !== undefined) {
      this.requests.delete(oldestKey);
    }
  }

  private cleanup(now: number): void {
    for (const [clientId, times] of this.requests.entries()) {
      const recent = times.filter((t) => now - t < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, recent);
      }
    }
  }
}
