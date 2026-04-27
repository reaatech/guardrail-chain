import { describe, it, expect, vi } from 'vitest';
import {
  getTracer,
  setTracer,
  type Tracer,
  type Span,
} from '../../../src/observability/tracing.js';

describe('Tracing', () => {
  it('should return default no-op tracer', () => {
    const tracer = getTracer();
    const span = tracer.startSpan('test');
    expect(() => span.setAttribute('k', 'v')).not.toThrow();
    expect(() => span.end()).not.toThrow();
  });

  it('should allow setting a custom tracer', () => {
    const mockSpan: Span = {
      id: 'span-1',
      setAttribute: vi.fn(),
      end: vi.fn(),
    };

    const custom: Tracer = {
      startSpan: vi.fn().mockReturnValue(mockSpan),
    };

    setTracer(custom);
    const tracer = getTracer();
    const span = tracer.startSpan('test');
    expect(custom.startSpan).toHaveBeenCalledWith('test');
    span.setAttribute('key', 'value');
    expect(mockSpan.setAttribute).toHaveBeenCalledWith('key', 'value');
  });
});
