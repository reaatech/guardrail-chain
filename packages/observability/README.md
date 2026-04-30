# @reaatech/guardrail-chain-observability

[![npm version](https://img.shields.io/npm/v/@reaatech/guardrail-chain-observability.svg)](https://www.npmjs.com/package/@reaatech/guardrail-chain-observability)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/guardrail-chain/ci.yml?branch=main&label=CI)](https://github.com/reaatech/guardrail-chain/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Pluggable observability interfaces for the Guardrail Chain framework — structured logging, metrics collection, and distributed tracing. All three subsystems default to no-op implementations so the library stays quiet by default. Install your own adapters (pino, OpenTelemetry, Prometheus, etc.) via the provided setter functions.

## Installation

```bash
npm install @reaatech/guardrail-chain-observability
# or
pnpm add @reaatech/guardrail-chain-observability
```

## Feature Overview

- **Structured logging** — four-level logging interface (`debug`, `info`, `warn`, `error`) with context objects. Ships with `ConsoleLogger` for development and `NoOpLogger` (default) for production silence.
- **Metrics collection** — counter, histogram, and gauge primitives with label support. Pluggable backend — swap in Prometheus, Datadog, or any other metrics system.
- **Distributed tracing** — span-based tracing with attribute support. Create spans, set attributes, and close them. Emit to OpenTelemetry or any tracing backend.
- **Module-level singletons** — `getLogger()`/`setLogger()`, `getMetrics()`/`setMetrics()`, `getTracer()`/`setTracer()` — set once at application startup, consumed everywhere.
- **Zero runtime dependencies** — pure TypeScript interfaces with no external package requirements.
- **Dual ESM/CJS output** — works with `import` and `require`.

## Quick Start

```typescript
import {
  setLogger,
  ConsoleLogger,
  setMetrics,
  setTracer,
} from '@reaatech/guardrail-chain-observability';

// Enable console logging
setLogger(new ConsoleLogger());

// Install custom metrics
setMetrics({
  increment(name, labels) {
    // emit to Prometheus / Datadog / etc.
  },
  histogram(name, value, labels) {
    // emit histogram
  },
  gauge(name, value, labels) {
    // emit gauge
  },
});

// Guardrail Chain now logs and emits metrics
```

## API Reference

### Logger

#### `Logger` (interface)

```typescript
interface Logger {
  debug(data: Record<string, unknown>, message: string): void;
  info(data: Record<string, unknown>, message: string): void;
  warn(data: Record<string, unknown>, message: string): void;
  error(data: Record<string, unknown>, message: string): void;
}
```

#### `ConsoleLogger` (class)

Implements `Logger`. Writes to `console.debug`, `console.info`, `console.warn`, and `console.error` with `[LEVEL]` prefix.

#### `NoOpLogger` (class)

Implements `Logger`. All methods are no-ops. This is the default logger when no logger is set.

#### `getLogger(): Logger`

Returns the current global logger instance.

#### `setLogger(logger: Logger): void`

Replaces the global logger. All subsequent calls to `getLogger()` return the new instance.

### Metrics

#### `MetricsCollector` (interface)

```typescript
interface MetricsCollector {
  increment(name: string, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
}
```

#### `getMetrics(): MetricsCollector`

Returns the current global metrics collector instance.

#### `setMetrics(metrics: MetricsCollector): void`

Replaces the global metrics collector. All subsequent calls to `getMetrics()` return the new instance.

### Tracing

#### `Tracer` (interface)

```typescript
interface Tracer {
  startSpan(name: string, parent?: Span): Span;
}
```

#### `Span` (interface)

```typescript
interface Span {
  id: string;
  setAttribute(key: string, value: string | number | boolean): void;
  end(): void;
}
```

#### `getTracer(): Tracer`

Returns the current global tracer instance.

#### `setTracer(tracer: Tracer): void`

Replaces the global tracer. All subsequent calls to `getTracer()` return the new instance.

## Usage Patterns

### Custom logger with pino

```typescript
import pino from 'pino';
import { setLogger } from '@reaatech/guardrail-chain-observability';

const pinoLogger = pino({ level: 'info' });

setLogger({
  debug(data, message) { pinoLogger.debug(data, message); },
  info(data, message)  { pinoLogger.info(data, message); },
  warn(data, message)  { pinoLogger.warn(data, message); },
  error(data, message) { pinoLogger.error(data, message); },
});
```

### Custom metrics with Prometheus

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';
import { setMetrics } from '@reaatech/guardrail-chain-observability';

const counters = new Map<string, Counter>();
const histograms = new Map<string, Histogram>();
const gauges = new Map<string, Gauge>();

setMetrics({
  increment(name, labels) {
    if (!counters.has(name)) {
      counters.set(name, new Counter({ name, help: name, labelNames: Object.keys(labels ?? {}) }));
    }
    counters.get(name)!.inc(labels);
  },
  histogram(name, value, labels) {
    if (!histograms.has(name)) {
      histograms.set(name, new Histogram({ name, help: name, labelNames: Object.keys(labels ?? {}) }));
    }
    histograms.get(name)!.observe(labels ?? {}, value);
  },
  gauge(name, value, labels) {
    if (!gauges.has(name)) {
      gauges.set(name, new Gauge({ name, help: name, labelNames: Object.keys(labels ?? {}) }));
    }
    gauges.get(name)!.set(labels ?? {}, value);
  },
});
```

### Custom tracer with OpenTelemetry

```typescript
import { trace } from '@opentelemetry/api';
import { setTracer } from '@reaatech/guardrail-chain-observability';

const otelTracer = trace.getTracer('guardrail-chain');

setTracer({
  startSpan(name, parent) {
    const ctx = parent ? trace.setSpan(trace.active(), parent as any) : trace.active();
    const span = otelTracer.startSpan(name, undefined, ctx);
    return {
      id: span.spanContext().spanId,
      setAttribute(key, value) { span.setAttribute(key, value as any); },
      end() { span.end(); },
    };
  },
});
```

## Related Packages

- [`@reaatech/guardrail-chain`](https://www.npmjs.com/package/@reaatech/guardrail-chain) — core framework — re-exports all observability getter/setter functions for single-import convenience
- [`@reaatech/guardrail-chain-guardrails`](https://www.npmjs.com/package/@reaatech/guardrail-chain-guardrails) — built-in guardrail implementations
- [`@reaatech/guardrail-chain-config`](https://www.npmjs.com/package/@reaatech/guardrail-chain-config) — configuration loader and Zod-based validator

## License

[MIT](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
