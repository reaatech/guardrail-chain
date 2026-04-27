/**
 * Zod-based configuration validation.
 */

import { z } from 'zod';
import type { LoadedConfig } from './types.js';

const budgetSchema = z.object({
  maxLatencyMs: z.number().positive('maxLatencyMs must be positive'),
  maxTokens: z.number().positive('maxTokens must be positive'),
  skipSlowGuardrailsUnderPressure: z.boolean().optional(),
});

const guardrailSchema = z.object({
  id: z.string().min(1, 'guardrail id is required'),
  type: z.enum(['input', 'output']),
  enabled: z.boolean(),
  timeout: z.number().positive().optional(),
  config: z.record(z.unknown()).optional(),
  shortCircuitOnFail: z.boolean().optional(),
  essential: z.boolean().optional(),
  priority: z.number().optional(),
  estimatedCostMs: z.number().positive().optional(),
});

const observabilitySchema = z.object({
  logger: z.boolean().optional(),
  metrics: z.boolean().optional(),
  tracing: z.boolean().optional(),
});

const chainSchema = z.object({
  budget: budgetSchema,
  guardrails: z.array(guardrailSchema).optional(),
  observability: observabilitySchema.optional(),
});

/**
 * Validate a raw configuration object against the schema.
 * @throws {z.ZodError} if validation fails
 */
export function validateConfig(config: unknown): LoadedConfig {
  return chainSchema.parse(config);
}

/**
 * Validate a raw configuration object and return a safe result.
 */
export function validateConfigSafe(config: unknown): {
  success: boolean;
  config?: LoadedConfig;
  error?: z.ZodError;
} {
  const result = chainSchema.safeParse(config);
  if (result.success) {
    return { success: true, config: result.data };
  }
  return { success: false, error: result.error };
}
