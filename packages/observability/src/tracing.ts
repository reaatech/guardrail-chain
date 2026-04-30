/**
 * Distributed tracing interface.
 */

export interface Tracer {
  startSpan(name: string, parent?: Span): Span;
}

export interface Span {
  id: string;
  setAttribute(key: string, value: string | number | boolean): void;
  end(): void;
}

class NoOpSpan implements Span {
  id = 'noop';
  setAttribute(): void {}
  end(): void {}
}

class NoOpTracer implements Tracer {
  startSpan(): Span {
    return new NoOpSpan();
  }
}

let globalTracer: Tracer = new NoOpTracer();

export function getTracer(): Tracer {
  return globalTracer;
}

export function setTracer(tracer: Tracer): void {
  globalTracer = tracer;
}
