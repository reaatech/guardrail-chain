/**
 * Retry utility with exponential backoff and jitter.
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  multiplier: number;
  /** Whether to add jitter to delay */
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  multiplier: 2,
  jitter: true,
};

/**
 * Determine if an error is recoverable and worth retrying.
 */
export type RetryPredicate = (error: Error, attempt: number) => boolean;

export const defaultRetryPredicate: RetryPredicate = (error) => {
  // Retry on timeout and transient network-like errors
  const recoverablePatterns = [
    'timeout',
    'timed out',
    'econnreset',
    'econnrefused',
    'etimedout',
    'temporarily unavailable',
    'rate limit',
    'too many requests',
  ];
  const lowerMessage = error.message.toLowerCase();
  return recoverablePatterns.some((pattern) => lowerMessage.includes(pattern));
};

/**
 * Execute an async function with retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  predicate: RetryPredicate = defaultRetryPredicate,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= cfg.maxRetries || !predicate(lastError, attempt)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, cfg);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry exhausted');
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponential = config.initialDelayMs * Math.pow(config.multiplier, attempt);
  const capped = Math.min(exponential, config.maxDelayMs);

  if (!config.jitter) {
    return capped;
  }

  // Full jitter: random value between 0 and capped
  return Math.random() * capped;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
