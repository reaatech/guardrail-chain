import { describe, it, expect, vi } from 'vitest';
import {
  getMetrics,
  setMetrics,
  type MetricsCollector,
} from '../../../src/observability/metrics.js';

describe('Metrics', () => {
  it('should return default no-op metrics', () => {
    const metrics = getMetrics();
    expect(() => metrics.increment('test')).not.toThrow();
    expect(() => metrics.histogram('test', 1)).not.toThrow();
    expect(() => metrics.gauge('test', 1)).not.toThrow();
  });

  it('should allow setting a custom metrics collector', () => {
    const custom: MetricsCollector = {
      increment: vi.fn(),
      histogram: vi.fn(),
      gauge: vi.fn(),
    };

    setMetrics(custom);
    const metrics = getMetrics();
    metrics.increment('foo', { bar: 'baz' });
    expect(custom.increment).toHaveBeenCalledWith('foo', { bar: 'baz' });
  });
});
