/**
 * Core type definitions for the Guardrail Chain framework.
 */

/** The fundamental guardrail interface */
export interface Guardrail<TInput = unknown, TOutput = unknown> {
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

  /** Essential guardrails cannot be skipped under budget pressure */
  essential?: boolean;

  /** Execution priority (lower = earlier). Used for budget-aware scheduling. */
  priority?: number;

  /** Estimated latency cost in milliseconds. Used by BudgetManager. */
  estimatedCostMs?: number;

  /**
   * Stop chain execution if this guardrail fails. Defaults to `true`.
   * Set to `false` to let the chain continue past a failing guardrail
   * (the chain still reports the failure on `ChainResult`).
   */
  shortCircuitOnFail?: boolean;

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

/** Result of guardrail execution */
export interface GuardrailResult<TOutput = unknown> {
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

/** State passed between guardrails during execution */
export interface ChainContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  budget: BudgetState;
  metadata: Record<string, unknown>;
  transformedInput: unknown;
  originalInput: unknown;
}

/** Budget tracking state */
export interface BudgetState {
  remainingLatency: number;
  remainingTokens: number;
  usedLatency: number;
  usedTokens: number;
}

/** Configuration for the chain */
export interface ChainConfig {
  budget: BudgetConfig;
  observability?: ObservabilityConfig;
  errorHandling?: ErrorHandlingConfig;
}

/** Budget constraints */
export interface BudgetConfig {
  maxLatencyMs: number;
  maxTokens: number;
  skipSlowGuardrailsUnderPressure?: boolean;
}

/** Individual guardrail configuration */
export interface GuardrailConfig {
  id: string;
  type: 'input' | 'output';
  enabled: boolean;
  timeout?: number;
  config?: Record<string, unknown>;
  /** Stop chain execution on failure */
  shortCircuitOnFail?: boolean;
  /** Mark as essential: cannot be skipped even under budget pressure */
  essential?: boolean;
  /** Execution priority (lower = earlier). Used for budget-aware scheduling. */
  priority?: number;
  /** Estimated latency cost in milliseconds. Used by BudgetManager. */
  estimatedCostMs?: number;
}

/** Observability settings */
export interface ObservabilityConfig {
  logger?: boolean;
  metrics?: boolean;
  tracing?: boolean;
}

/** Error handling strategy */
export interface ErrorHandlingConfig {
  failOpen?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

/** Well-known fields attached to ChainResult.metadata. */
export interface ChainResultMetadata {
  /** Correlation ID threaded through observability */
  correlationId?: string;
  /** Input phase duration in milliseconds */
  inputDuration?: number;
  /** Output phase duration in milliseconds */
  outputDuration?: number;
  /** Total chain duration in milliseconds */
  totalDuration?: number;
  /** Which phase failed (only present on failure) */
  phase?: 'input' | 'output';
  /** Per-guardrail results collected during the failing phase */
  results?: GuardrailResult[];
  /** Budget remaining after the failing phase */
  budget?: BudgetState;
  /** Additional custom fields */
  [key: string]: unknown;
}

/** Result of a complete chain execution */
export interface ChainResult {
  success: boolean;
  output?: unknown;
  error?: string;
  failedGuardrail?: string;
  metadata?: ChainResultMetadata;
}

/** Execution options for a single chain run */
export interface ExecutionOptions {
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}
