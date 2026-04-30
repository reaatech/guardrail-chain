import { describe, expect, it } from 'vitest';

describe('config index exports', () => {
  it('should export loader functions', async () => {
    const { loadConfig, loadConfigFromFile, loadConfigFromEnv } = await import('./index.js');
    expect(typeof loadConfig).toBe('function');
    expect(typeof loadConfigFromFile).toBe('function');
    expect(typeof loadConfigFromEnv).toBe('function');
  });

  it('should export validator functions', async () => {
    const { validateConfig, validateConfigSafe } = await import('./index.js');
    expect(typeof validateConfig).toBe('function');
    expect(typeof validateConfigSafe).toBe('function');
  });

  it('should export types without runtime errors', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
