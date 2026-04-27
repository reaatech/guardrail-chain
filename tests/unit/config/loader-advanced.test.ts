import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, loadConfigFromEnv } from '../../../src/config/loader.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadConfig', () => {
  const tmpDir = join(tmpdir(), 'guardrail-chain-test-' + Date.now());

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    delete process.env.GUARDRAIL_CHAIN_CONFIG;
    delete process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS;
    delete process.env.GUARDRAIL_CHAIN_BUDGET_MAX_TOKENS;
    delete process.env.GUARDRAIL_CHAIN_BUDGET_SKIP_SLOW;
  });

  it('should load config from JSON file', async () => {
    const filePath = join(tmpDir, 'config.json');
    await writeFile(filePath, JSON.stringify({ budget: { maxLatencyMs: 2000, maxTokens: 8000 } }));

    const config = await loadConfig({ filePath, useEnv: false });
    expect(config.budget.maxLatencyMs).toBe(2000);
    expect(config.budget.maxTokens).toBe(8000);
  });

  it('should load config from YAML file', async () => {
    const filePath = join(tmpDir, 'config.yaml');
    await writeFile(filePath, 'budget:\n  maxLatencyMs: 3000\n  maxTokens: 16000\n');

    const config = await loadConfig({ filePath, useEnv: false });
    expect(config.budget.maxLatencyMs).toBe(3000);
    expect(config.budget.maxTokens).toBe(16000);
  });

  it('should merge env overrides with file config', async () => {
    const filePath = join(tmpDir, 'config.json');
    await writeFile(filePath, JSON.stringify({ budget: { maxLatencyMs: 2000, maxTokens: 8000 } }));

    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS = '500';
    const config = await loadConfig({ filePath, useEnv: true });

    expect(config.budget.maxLatencyMs).toBe(500);
    // env loader fills in defaults for missing budget fields
    expect(config.budget.maxTokens).toBe(4000);
  });

  it('should use env config when no file provided', async () => {
    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS = '750';
    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_TOKENS = '2000';

    const config = await loadConfig({ useEnv: true });
    expect(config.budget.maxLatencyMs).toBe(750);
    expect(config.budget.maxTokens).toBe(2000);
  });

  it('should use custom env prefix', async () => {
    process.env.CUSTOM_BUDGET_MAX_LATENCY_MS = '999';

    const config = await loadConfig({ useEnv: true, envPrefix: 'CUSTOM' });
    expect(config.budget.maxLatencyMs).toBe(999);
  });

  it('should return full config from GUARDRAIL_CHAIN_CONFIG env var', async () => {
    process.env.GUARDRAIL_CHAIN_CONFIG = JSON.stringify({
      budget: { maxLatencyMs: 111, maxTokens: 222 },
    });

    const config = await loadConfig({ useEnv: true });
    expect(config.budget.maxLatencyMs).toBe(111);
    expect(config.budget.maxTokens).toBe(222);
  });

  it('should ignore invalid JSON in GUARDRAIL_CHAIN_CONFIG', async () => {
    process.env.GUARDRAIL_CHAIN_CONFIG = 'not-json';
    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS = '333';

    const config = await loadConfig({ useEnv: true });
    expect(config.budget.maxLatencyMs).toBe(333);
  });

  it('should deep merge nested objects', async () => {
    const filePath = join(tmpDir, 'config.json');
    await writeFile(
      filePath,
      JSON.stringify({
        budget: { maxLatencyMs: 1000, maxTokens: 4000, skipSlowGuardrailsUnderPressure: false },
      }),
    );

    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS = '2000';
    const config = await loadConfig({ filePath, useEnv: true });

    expect(config.budget.maxLatencyMs).toBe(2000);
    expect(config.budget.maxTokens).toBe(4000);
  });
});

describe('loadConfigFromEnv edge cases', () => {
  afterEach(() => {
    delete process.env.GUARDRAIL_CHAIN_CONFIG;
    delete process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS;
    delete process.env.GUARDRAIL_CHAIN_BUDGET_MAX_TOKENS;
    delete process.env.GUARDRAIL_CHAIN_BUDGET_SKIP_SLOW;
  });

  it('should return empty object when no env vars set', () => {
    const config = loadConfigFromEnv();
    expect(Object.keys(config)).toHaveLength(0);
  });

  it('should parse skipSlow as boolean', () => {
    process.env.GUARDRAIL_CHAIN_BUDGET_SKIP_SLOW = 'true';
    const config = loadConfigFromEnv();
    expect(config.budget?.skipSlowGuardrailsUnderPressure).toBe(true);
  });

  it('should handle skipSlow set to false string', () => {
    process.env.GUARDRAIL_CHAIN_BUDGET_SKIP_SLOW = 'false';
    const config = loadConfigFromEnv();
    expect(config.budget?.skipSlowGuardrailsUnderPressure).toBe(false);
  });
});
