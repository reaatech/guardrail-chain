/**
 * Configuration loader supporting JSON, YAML, and environment variables.
 */

import { readFile } from 'fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { validateConfig, validateConfigSafe } from './validator.js';
import { getLogger } from '../observability/logger.js';
import type { LoadedConfig, LoadConfigOptions } from './types.js';

/**
 * Load configuration from a file path.
 * Supports `.json`, `.yaml`, and `.yml` extensions.
 */
export async function loadConfigFromFile(filePath: string): Promise<LoadedConfig> {
  const content = await readFile(filePath, 'utf-8');
  const parsed: unknown =
    filePath.endsWith('.yaml') || filePath.endsWith('.yml')
      ? yamlLoad(content)
      : JSON.parse(content);

  return validateConfig(parsed);
}

/**
 * Load configuration from environment variables.
 *
 * Supports:
 * - `GUARDRAIL_CHAIN_CONFIG` — raw JSON string of the full config
 * - `GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS`
 * - `GUARDRAIL_CHAIN_BUDGET_MAX_TOKENS`
 * - `GUARDRAIL_CHAIN_BUDGET_SKIP_SLOW` — "true" or "false"
 */
export function loadConfigFromEnv(prefix = 'GUARDRAIL_CHAIN'): Partial<LoadedConfig> {
  const result: Partial<LoadedConfig> = {};

  // Full config override
  const fullConfig = process.env[`${prefix}_CONFIG`];
  if (fullConfig) {
    try {
      const parsed: unknown = JSON.parse(fullConfig);
      const validated = validateConfigSafe(parsed);
      if (validated.success && validated.config) {
        return validated.config;
      }
      getLogger().warn(
        { envVar: `${prefix}_CONFIG`, issues: validated.error?.issues },
        'Env config failed schema validation; falling back to per-field overrides',
      );
    } catch (err) {
      getLogger().warn(
        { envVar: `${prefix}_CONFIG`, error: err instanceof Error ? err.message : String(err) },
        'Env config is not valid JSON; falling back to per-field overrides',
      );
    }
  }

  // Budget overrides
  const maxLatency = process.env[`${prefix}_BUDGET_MAX_LATENCY_MS`];
  const maxTokens = process.env[`${prefix}_BUDGET_MAX_TOKENS`];
  const skipSlow = process.env[`${prefix}_BUDGET_SKIP_SLOW`];

  if (maxLatency || maxTokens || skipSlow !== undefined) {
    result.budget = {
      maxLatencyMs: maxLatency ? parseInt(maxLatency, 10) : 1000,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : 4000,
      skipSlowGuardrailsUnderPressure: skipSlow === 'true',
    };
  }

  return result;
}

/**
 * Load configuration with options.
 * Merges file config with environment overrides (env wins).
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const { filePath, useEnv = true, envPrefix = 'GUARDRAIL_CHAIN' } = options;

  let config: Partial<LoadedConfig> = {};

  if (filePath) {
    config = await loadConfigFromFile(filePath);
  }

  if (useEnv) {
    const envConfig = loadConfigFromEnv(envPrefix);
    config = deepMerge(config, envConfig);
  }

  // Validate the merged result
  return validateConfig(config);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      result[key] &&
      typeof result[key] === 'object'
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
