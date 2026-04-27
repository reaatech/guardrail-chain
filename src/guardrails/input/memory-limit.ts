import type { Guardrail, GuardrailResult, ChainContext } from '../../core/types.js';

interface MemoryLimitConfig {
  maxMemoryMB?: number;
}

/**
 * Guardrail that checks if process memory usage is within acceptable limits.
 * Skips gracefully if process.memoryUsage is unavailable (e.g. browser environments).
 */
export class MemoryLimit implements Guardrail<unknown, unknown> {
  readonly id = 'memory-limit';
  readonly name = 'Memory Limit Check';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 1000;

  constructor(private config: MemoryLimitConfig = {}) {}

  async execute(input: unknown, _context: ChainContext): Promise<GuardrailResult<unknown>> {
    const startTime = Date.now();

    try {
      if (typeof process === 'undefined' || !process.memoryUsage) {
        return {
          passed: true,
          output: input,
          metadata: { duration: Date.now() - startTime, skipped: true },
        };
      }

      const maxMemoryMB = this.config.maxMemoryMB ?? 512;
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const passed = heapUsedMB <= maxMemoryMB;

      return {
        passed,
        output: input,
        metadata: {
          duration: Date.now() - startTime,
          heapUsedMB,
          maxMemoryMB,
        },
        error: passed
          ? undefined
          : new Error(`Memory limit exceeded: ${heapUsedMB}MB > ${maxMemoryMB}MB`),
      };
    } catch (error) {
      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
