import { describe, it, expect } from 'vitest';
import {
  getLogger,
  setLogger,
  getMetrics,
  setMetrics,
  getTracer,
  setTracer,
  ConsoleLogger,
  NoOpLogger,
} from '../../../src/observability/index.js';

describe('Observability index exports', () => {
  it('should export logger getter and setter', () => {
    expect(typeof getLogger).toBe('function');
    expect(typeof setLogger).toBe('function');
  });

  it('should export metrics getter and setter', () => {
    expect(typeof getMetrics).toBe('function');
    expect(typeof setMetrics).toBe('function');
  });

  it('should export tracer getter and setter', () => {
    expect(typeof getTracer).toBe('function');
    expect(typeof setTracer).toBe('function');
  });

  it('should expose both ConsoleLogger and NoOpLogger implementations', () => {
    expect(typeof ConsoleLogger).toBe('function');
    expect(typeof NoOpLogger).toBe('function');
  });
});
