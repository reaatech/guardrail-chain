/**
 * Configuration-specific types for the Guardrail Chain framework.
 */

import type { BudgetConfig, GuardrailConfig, ObservabilityConfig } from '@reaatech/guardrail-chain';

/** Configuration loaded from file or environment */
export interface LoadedConfig {
  budget: BudgetConfig;
  guardrails?: GuardrailConfig[];
  observability?: ObservabilityConfig;
}

/** Options for loading configuration */
export interface LoadConfigOptions {
  /** Path to config file (JSON or YAML) */
  filePath?: string;
  /** Whether to merge with environment variables */
  useEnv?: boolean;
  /** Environment variable prefix */
  envPrefix?: string;
}
