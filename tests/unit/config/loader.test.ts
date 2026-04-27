import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink } from 'fs/promises';
import { loadConfigFromFile, loadConfigFromEnv } from '../../../src/config/loader.js';

describe('loadConfigFromFile', () => {
  const jsonPath = '/tmp/test-config.json';
  const yamlPath = '/tmp/test-config.yaml';

  afterEach(async () => {
    try {
      await unlink(jsonPath);
      // eslint-disable-next-line no-empty
    } catch {}
    try {
      await unlink(yamlPath);
      // eslint-disable-next-line no-empty
    } catch {}
  });

  it('should load JSON config', async () => {
    await writeFile(jsonPath, JSON.stringify({ budget: { maxLatencyMs: 500, maxTokens: 2000 } }));
    const config = await loadConfigFromFile(jsonPath);
    expect(config.budget.maxLatencyMs).toBe(500);
  });

  it('should load YAML config', async () => {
    await writeFile(yamlPath, 'budget:\n  maxLatencyMs: 300\n  maxTokens: 1500');
    const config = await loadConfigFromFile(yamlPath);
    expect(config.budget.maxLatencyMs).toBe(300);
  });

  it('should throw on invalid file content', async () => {
    await writeFile(jsonPath, 'not json');
    await expect(loadConfigFromFile(jsonPath)).rejects.toThrow();
  });
});

describe('loadConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load from GUARDRAIL_CHAIN_CONFIG', () => {
    process.env.GUARDRAIL_CHAIN_CONFIG = JSON.stringify({
      budget: { maxLatencyMs: 250, maxTokens: 1000 },
    });
    const config = loadConfigFromEnv();
    expect(config.budget?.maxLatencyMs).toBe(250);
  });

  it('should load budget overrides from individual env vars', () => {
    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_LATENCY_MS = '750';
    process.env.GUARDRAIL_CHAIN_BUDGET_MAX_TOKENS = '3000';
    process.env.GUARDRAIL_CHAIN_BUDGET_SKIP_SLOW = 'true';
    const config = loadConfigFromEnv();
    expect(config.budget?.maxLatencyMs).toBe(750);
    expect(config.budget?.maxTokens).toBe(3000);
    expect(config.budget?.skipSlowGuardrailsUnderPressure).toBe(true);
  });

  it('should ignore invalid GUARDRAIL_CHAIN_CONFIG', () => {
    process.env.GUARDRAIL_CHAIN_CONFIG = 'not json';
    const config = loadConfigFromEnv();
    expect(config.budget).toBeUndefined();
  });
});
