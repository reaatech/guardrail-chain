import type {
  Guardrail,
  GuardrailResult,
  ChainContext,
  ChainConfig,
  ChainResult,
  ExecutionOptions,
  BudgetConfig,
  GuardrailConfig,
} from './types.js';
import { BudgetManager } from './budget.js';
import { createChainContext } from './context.js';
import { TimeoutError } from '../utils/errors.js';
import { getLogger } from '../observability/logger.js';
import { getMetrics } from '../observability/metrics.js';
import { getTracer } from '../observability/tracing.js';
import { withRetry, defaultRetryPredicate, type RetryConfig } from '../utils/retry.js';

/**
 * Orchestrator that manages guardrail execution with budget awareness
 * and short-circuit logic.
 */
export class GuardrailChain {
  private inputGuardrails: Guardrail[] = [];
  private outputGuardrails: Guardrail[] = [];
  private budgetConfig: BudgetConfig;
  private skipSlowGuardrails: boolean;
  private retryConfig?: Partial<RetryConfig>;

  constructor(config: ChainConfig) {
    this.budgetConfig = config.budget;
    this.skipSlowGuardrails = config.budget.skipSlowGuardrailsUnderPressure ?? true;
    this.retryConfig = config.errorHandling
      ? {
          maxRetries: config.errorHandling.maxRetries ?? 3,
          initialDelayMs: config.errorHandling.retryDelayMs ?? 100,
          maxDelayMs: 5000,
          multiplier: 2,
          jitter: true,
        }
      : undefined;
  }

  /**
   * Add a guardrail to the chain.
   */
  addGuardrail(guardrail: Guardrail): this {
    if (guardrail.type === 'input') {
      this.inputGuardrails.push(guardrail);
    } else {
      this.outputGuardrails.push(guardrail);
    }
    return this;
  }

  /**
   * Execute the full chain: input guardrails, then output guardrails.
   * Note: This does NOT call an LLM; it processes input and output sequentially.
   */
  async execute(input: unknown, options?: ExecutionOptions): Promise<ChainResult> {
    const logger = getLogger();
    const metrics = getMetrics();
    const tracer = getTracer();
    const span = tracer.startSpan('execute_chain');
    const startTime = Date.now();

    const context = createChainContext(input, this.budgetConfig, {
      correlationId: options?.correlationId,
      userId: options?.userId,
      sessionId: options?.sessionId,
    });

    span.setAttribute('correlation_id', context.correlationId);
    span.setAttribute('input_type', typeof input);

    logger.info(
      { correlationId: context.correlationId, inputType: typeof input },
      'Chain execution started',
    );

    // Execute input guardrails
    const inputResult = await this.executeInputGuardrails(input, context);
    metrics.histogram('chain.input.duration', Date.now() - startTime, {
      correlation_id: context.correlationId,
    });

    if (!inputResult.passed) {
      metrics.increment('chain.input.failed', {
        guardrail_id: inputResult.failedGuardrail ?? '',
      });
      logger.warn(
        { correlationId: context.correlationId, failedGuardrail: inputResult.failedGuardrail },
        'Input guardrail failed',
      );
      span.end();
      return {
        success: false,
        error: inputResult.error?.message ?? 'Input guardrail failed',
        failedGuardrail: inputResult.failedGuardrail,
        metadata: { phase: 'input', ...inputResult.metadata },
      };
    }

    // Execute output guardrails on the transformed input
    // (In a real app, the LLM call would happen between input and output phases.)
    const outputStart = Date.now();
    const outputResult = await this.executeOutputGuardrails(inputResult.transformedInput, context);
    metrics.histogram('chain.output.duration', Date.now() - outputStart, {
      correlation_id: context.correlationId,
    });

    if (!outputResult.passed) {
      metrics.increment('chain.output.failed', {
        guardrail_id: outputResult.failedGuardrail ?? '',
      });
      logger.warn(
        { correlationId: context.correlationId, failedGuardrail: outputResult.failedGuardrail },
        'Output guardrail failed',
      );
      span.end();
      return {
        success: false,
        error: outputResult.error?.message ?? 'Output guardrail failed',
        failedGuardrail: outputResult.failedGuardrail,
        metadata: { phase: 'output', ...outputResult.metadata },
      };
    }

    const totalDuration = Date.now() - startTime;
    metrics.histogram('chain.duration', totalDuration, {
      correlation_id: context.correlationId,
    });
    metrics.increment('chain.success');
    logger.info(
      { correlationId: context.correlationId, duration: totalDuration },
      'Chain execution completed',
    );
    span.end();

    return {
      success: true,
      output: outputResult.transformedOutput,
      metadata: {
        correlationId: context.correlationId,
        inputDuration: inputResult.metadata?.duration,
        outputDuration: outputResult.metadata?.duration,
        totalDuration,
      },
    };
  }

  /**
   * Execute only input guardrails.
   */
  async executeInput(input: unknown, options?: ExecutionOptions): Promise<ChainResult> {
    const context = createChainContext(input, this.budgetConfig, {
      correlationId: options?.correlationId,
      userId: options?.userId,
      sessionId: options?.sessionId,
    });

    const result = await this.executeInputGuardrails(input, context);
    return {
      success: result.passed,
      output: result.transformedInput,
      error: result.error?.message,
      failedGuardrail: result.failedGuardrail,
      metadata: result.metadata ? { ...result.metadata } : undefined,
    };
  }

  /**
   * Execute only output guardrails.
   */
  async executeOutput(output: unknown, context: ChainContext): Promise<ChainResult> {
    const result = await this.executeOutputGuardrails(output, context);
    return {
      success: result.passed,
      output: result.transformedOutput,
      error: result.error?.message,
      failedGuardrail: result.failedGuardrail,
      metadata: result.metadata ? { ...result.metadata } : undefined,
    };
  }

  private async executeInputGuardrails(
    input: unknown,
    context: ChainContext,
  ): Promise<GuardrailPhaseResult> {
    const guardrails = this.prepareGuardrails(this.inputGuardrails, context.budget);
    return this.runGuardrails(guardrails, input, context);
  }

  private async executeOutputGuardrails(
    output: unknown,
    context: ChainContext,
  ): Promise<GuardrailPhaseResult> {
    const guardrails = this.prepareGuardrails(this.outputGuardrails, context.budget);
    return this.runGuardrails(guardrails, output, context);
  }

  /**
   * Schedule guardrails according to budget constraints.
   */
  private prepareGuardrails(guardrails: Guardrail[], budget: ChainContext['budget']): Guardrail[] {
    // Filter disabled
    const enabled = guardrails.filter((g) => g.enabled);

    if (!this.skipSlowGuardrails) {
      return enabled;
    }

    // Sort by priority (lower = earlier), then by estimated cost
    const sorted = enabled.sort((a, b) => {
      const pa = this.getGuardrailConfig(a).priority ?? 50;
      const pb = this.getGuardrailConfig(b).priority ?? 50;
      if (pa !== pb) return pa - pb;
      return (
        (this.getGuardrailConfig(a).estimatedCostMs ?? 50) -
        (this.getGuardrailConfig(b).estimatedCostMs ?? 50)
      );
    });

    // Select guardrails that fit within remaining budget
    let remaining = budget.remainingLatency;
    const selected: Guardrail[] = [];

    for (const g of sorted) {
      const config = this.getGuardrailConfig(g);
      const cost = config.estimatedCostMs ?? 50;
      const essential = config.essential ?? false;

      if (cost <= remaining || essential) {
        selected.push(g);
        remaining -= cost;
      }
    }

    return selected;
  }

  private getGuardrailConfig(guardrail: Guardrail): GuardrailConfig {
    return {
      id: guardrail.id,
      type: guardrail.type,
      enabled: guardrail.enabled,
      timeout: guardrail.timeout,
      essential: guardrail.essential ?? false,
      priority: guardrail.priority ?? 50,
      estimatedCostMs: guardrail.estimatedCostMs ?? 50,
      shortCircuitOnFail: guardrail.shortCircuitOnFail ?? true,
    };
  }

  private async runGuardrails(
    guardrails: Guardrail[],
    input: unknown,
    context: ChainContext,
  ): Promise<GuardrailPhaseResult> {
    const logger = getLogger();
    const metrics = getMetrics();
    const budgetManager = new BudgetManager(this.budgetConfig);
    budgetManager.recordExecution(context.budget.usedLatency, context.budget.usedTokens);

    let currentInput = input;
    let passed = true;
    let failedGuardrail: string | undefined;
    let error: Error | undefined;
    const results: GuardrailResult[] = [];
    const startTime = Date.now();

    for (const guardrail of guardrails) {
      const estimatedCost = this.getGuardrailConfig(guardrail).estimatedCostMs ?? 50;

      if (!budgetManager.canExecute(estimatedCost)) {
        results.push({
          passed: true,
          metadata: { duration: 0, skipped: true, reason: 'budget_exceeded' },
        });
        metrics.increment('guardrail.skipped', {
          guardrail_id: guardrail.id,
          reason: 'budget_exceeded',
        });
        continue;
      }

      const grStart = Date.now();
      let result: GuardrailResult;

      logger.debug(
        { correlationId: context.correlationId, guardrailId: guardrail.id },
        'Executing guardrail',
      );

      try {
        result = await this.executeWithTimeout(guardrail, currentInput, context);
      } catch (err) {
        result = {
          passed: false,
          metadata: { duration: Date.now() - grStart },
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }

      const grDuration = result.metadata?.duration ?? Date.now() - grStart;
      results.push(result);
      budgetManager.recordExecution(grDuration);

      metrics.histogram('guardrail.duration', grDuration, {
        guardrail_id: guardrail.id,
        guardrail_type: guardrail.type,
      });
      metrics.increment('guardrail.executed', {
        guardrail_id: guardrail.id,
        result: result.passed ? 'passed' : 'failed',
      });

      if (result.output !== undefined) {
        currentInput = result.output;
        context.transformedInput = currentInput;
      }

      if (!result.passed) {
        passed = false;
        failedGuardrail = guardrail.id;
        error = result.error;

        const shouldShortCircuit = this.getGuardrailConfig(guardrail).shortCircuitOnFail ?? true;
        if (shouldShortCircuit) {
          break;
        }
      }
    }

    // Propagate accumulated budget usage back onto context so the next phase
    // (e.g. output guardrails after input guardrails) sees it.
    const remaining = budgetManager.getRemainingBudget();
    context.budget.usedLatency = remaining.usedLatency;
    context.budget.usedTokens = remaining.usedTokens;
    context.budget.remainingLatency = remaining.remainingLatency;
    context.budget.remainingTokens = remaining.remainingTokens;

    return {
      passed,
      transformedInput: currentInput,
      transformedOutput: currentInput,
      failedGuardrail,
      error,
      metadata: {
        duration: Date.now() - startTime,
        results,
        budget: remaining,
      },
    };
  }

  private async executeWithTimeout(
    guardrail: Guardrail,
    input: unknown,
    context: ChainContext,
  ): Promise<GuardrailResult> {
    const timeout = guardrail.timeout ?? this.budgetConfig.maxLatencyMs;

    const executeGuardrail = async (): Promise<GuardrailResult> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          reject(new TimeoutError(guardrail.id));
        }, timeout);
        id.unref?.();
      });
      return Promise.race([guardrail.execute(input, context), timeoutPromise]);
    };

    if (this.retryConfig) {
      return withRetry(executeGuardrail, defaultRetryPredicate, this.retryConfig);
    }

    return executeGuardrail();
  }
}

interface GuardrailPhaseMetadata {
  duration: number;
  results: GuardrailResult[];
  budget: import('./types.js').BudgetState;
}

interface GuardrailPhaseResult {
  passed: boolean;
  transformedInput: unknown;
  transformedOutput: unknown;
  failedGuardrail?: string;
  error?: Error;
  metadata?: GuardrailPhaseMetadata;
}
