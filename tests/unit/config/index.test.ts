import { describe, it, expect } from 'vitest';

describe('config index exports', () => {
  it('should export loader functions', async () => {
    const { loadConfig, loadConfigFromFile, loadConfigFromEnv } =
      await import('../../../src/config/index.js');
    expect(typeof loadConfig).toBe('function');
    expect(typeof loadConfigFromFile).toBe('function');
    expect(typeof loadConfigFromEnv).toBe('function');
  });

  it('should export validator functions', async () => {
    const { validateConfig, validateConfigSafe } = await import('../../../src/config/index.js');
    expect(typeof validateConfig).toBe('function');
    expect(typeof validateConfigSafe).toBe('function');
  });

  it('should export types without runtime errors', async () => {
    const mod = await import('../../../src/config/index.js');
    // Types are compile-time only; ensure module loads
    expect(mod).toBeDefined();
  });
});
