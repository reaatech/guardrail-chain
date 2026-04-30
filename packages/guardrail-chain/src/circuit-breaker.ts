/**
 * Circuit breaker pattern for failing guardrails.
 *
 * This is an opt-in advanced utility — the built-in chain does NOT wrap
 * guardrails in a circuit breaker automatically. Use it when wrapping
 * guardrails that call external services (moderation APIs, model hosts,
 * etc.) so a partial outage does not burn your latency budget on every
 * request. Typical usage:
 *
 *   const breaker = new CircuitBreaker('moderation-api');
 *   class ExternalModeration implements Guardrail<string, string> {
 *     async execute(input, ctx) {
 *       return breaker.execute(() => callModerationAPI(input, ctx));
 *     }
 *   }
 */

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close the circuit */
  resetTimeoutMs: number;
  /** Number of successes required to fully close the circuit */
  successThreshold: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 2,
};

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker that prevents calls to a failing guardrail.
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
  ) {}

  /**
   * Execute a function through the circuit breaker.
   * @throws {Error} if the circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
      } else {
        throw new Error(
          `Circuit breaker '${this.name}' is OPEN. Last failure: ${this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : 'unknown'}`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime?: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successes = 0;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs;
  }
}
