# @reaatech/guardrail-chain-config

[![npm version](https://img.shields.io/npm/v/@reaatech/guardrail-chain-config.svg)](https://www.npmjs.com/package/@reaatech/guardrail-chain-config)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/guardrail-chain/ci.yml?branch=main&label=CI)](https://github.com/reaatech/guardrail-chain/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Configuration system for the Guardrail Chain framework — load guardrail chain configuration from JSON files, YAML files, and environment variables, with deep merging and Zod-based validation.

## Installation

```bash
npm install @reaatech/guardrail-chain-config
# or
pnpm add @reaatech/guardrail-chain-config
```

## Feature Overview

- **Multi-source loading** — load from JSON files (`.json`), YAML files (`.yaml`, `.yml`), and environment variables with a configurable prefix.
- **Deep merge** — file config and environment overrides are deep-merged, with environment variables taking precedence.
- **Zod validation** — all loaded configuration is validated against a Zod schema. Invalid config throws early with descriptive error messages.
- **Safe validation** — `validateConfigSafe()` returns a result object instead of throwing, useful for programmatic validation at runtime.
- **Per-field environment overrides** — set individual budget fields via environment variables without providing a full config.
- **Dual ESM/CJS output** — works with `import` and `require`.

## Quick Start

```typescript
import { loadConfig, validateConfig } from '@reaatech/guardrail-chain-config';
import { GuardrailChain } from '@reaatech/guardrail-chain';

// Load from a YAML file with environment overrides
const config = await loadConfig({ filePath: './guardrail.config.yaml' });

// Or load from environment only
const envConfig = await loadConfig({ useEnv: true });

// Or validate a raw object
const rawConfig = validateConfig({
  budget: { maxLatencyMs: 500, maxTokens: 4000 },
});

const chain = new GuardrailChain(config);
```

## API Reference

### `loadConfig(options?: LoadConfigOptions): Promise<LoadedConfig>`

Loads configuration from file and/or environment, deep-merges the results, and returns a validated `LoadedConfig`.

```typescript
const config = await loadConfig({
  filePath: './guardrail.yaml',
  useEnv: true,
  envPrefix: 'GUARDRAIL_CHAIN',
});
```

### `loadConfigFromFile(filePath: string): Promise<LoadedConfig>`

Loads and validates configuration from a JSON or YAML file. Extension determines the parser.

```typescript
const config = await loadConfigFromFile('./config.json');
```

### `loadConfigFromEnv(prefix?: string): Partial<LoadedConfig>`

Loads configuration from environment variables. Supports:

- `{PREFIX}_CONFIG` — raw JSON string of the full config.
- `{PREFIX}_BUDGET_MAX_LATENCY_MS` — max latency budget in milliseconds.
- `{PREFIX}_BUDGET_MAX_TOKENS` — max token budget.
- `{PREFIX}_BUDGET_SKIP_SLOW` — skip slow guardrails (`"true"` / `"false"`).

```typescript
import { loadConfigFromEnv } from '@reaatech/guardrail-chain-config';

const config = loadConfigFromEnv('GUARDRAIL_CHAIN');
// { budget: { maxLatencyMs: 500, maxTokens: 4000, skipSlowGuardrailsUnderPressure: false } }
```

### `validateConfig(config: unknown): LoadedConfig`

Validates a raw configuration object against the Zod schema. Throws `ZodError` on failure.

```typescript
import { validateConfig } from '@reaatech/guardrail-chain-config';

const config = validateConfig({ budget: { maxLatencyMs: 500, maxTokens: 4000 } });
```

### `validateConfigSafe(config: unknown)`

Validates and returns a result object — never throws.

```typescript
import { validateConfigSafe } from '@reaatech/guardrail-chain-config';

const result = validateConfigSafe(rawInput);
if (result.success) {
  // result.config is the validated LoadedConfig
} else {
  // result.error is the ZodError with details
}
```

#### Return Type

| Property | Type | Description |
|----------|------|-------------|
| `success` | `boolean` | Whether validation passed. |
| `config` | `LoadedConfig \| undefined` | The validated config if `success` is `true`. |
| `error` | `z.ZodError \| undefined` | The validation error if `success` is `false`. |

### `LoadConfigOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `filePath` | `string \| undefined` | — | Path to config file (`.json`, `.yaml`, or `.yml`). |
| `useEnv` | `boolean \| undefined` | `true` | Whether to merge with environment variables. |
| `envPrefix` | `string \| undefined` | `'GUARDRAIL_CHAIN'` | Prefix for environment variable lookups. |

### `LoadedConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `budget` | `BudgetConfig` | Yes | Budget constraints — `maxLatencyMs`, `maxTokens`, `skipSlowGuardrailsUnderPressure`. |
| `guardrails` | `GuardrailConfig[]` | No | Per-guardrail configuration overrides. |
| `observability` | `ObservabilityConfig` | No | Toggles for observability subsystems. |

## Usage Patterns

### Configuration file (YAML)

```yaml
# guardrail.config.yaml
budget:
  maxLatencyMs: 1000
  maxTokens: 8000
  skipSlowGuardrailsUnderPressure: true

guardrails:
  - id: pii-redaction
    type: input
    enabled: true
    timeout: 500
    essential: true
    priority: 10

observability:
  logger: true
  metrics: true
```

```typescript
import { loadConfig } from '@reaatech/guardrail-chain-config';

const config = await loadConfig({ filePath: 'guardrail.config.yaml' });
```

### Configuration file (JSON)

```json
{
  "budget": {
    "maxLatencyMs": 500,
    "maxTokens": 4000
  }
}
```

```typescript
const config = await loadConfig({ filePath: './config.json', useEnv: false });
```

### Full config from environment variable

```bash
export GUARDRAIL_CHAIN_CONFIG='{"budget":{"maxLatencyMs":111,"maxTokens":222}}'
```

```typescript
const config = await loadConfig({ useEnv: true });
// config.budget.maxLatencyMs === 111
// config.budget.maxTokens === 222
```

### Individual field overrides

```bash
export GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS=750
export GUARDRAIL_CHAIN_BUDGET_MAX_TOKENS=2000
```

```typescript
import { loadConfigFromEnv } from '@reaatech/guardrail-chain-config';

const config = loadConfigFromEnv();
// config.budget.maxLatencyMs === 750
// config.budget.maxTokens === 2000
```

### Custom environment prefix

```typescript
const config = await loadConfig({ useEnv: true, envPrefix: 'MY_APP' });
// Reads MY_APP_CONFIG, MY_APP_BUDGET_MAX_LATENCY_MS, etc.
```

## Related Packages

- [`@reaatech/guardrail-chain`](https://www.npmjs.com/package/@reaatech/guardrail-chain) — core framework with chain orchestration, budget management, and types
- [`@reaatech/guardrail-chain-guardrails`](https://www.npmjs.com/package/@reaatech/guardrail-chain-guardrails) — built-in guardrail implementations
- [`@reaatech/guardrail-chain-observability`](https://www.npmjs.com/package/@reaatech/guardrail-chain-observability) — pluggable logging, metrics, and tracing interfaces

## License

[MIT](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
