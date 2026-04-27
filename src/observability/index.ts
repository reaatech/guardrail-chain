/**
 * Observability exports — logging, metrics, and tracing.
 *
 * All three subsystems default to no-op implementations. Use the
 * `setLogger` / `setMetrics` / `setTracer` functions to install your own
 * adapters (pino, OpenTelemetry, Prometheus, etc.).
 */

export { getLogger, setLogger, ConsoleLogger, NoOpLogger, type Logger } from './logger.js';
export { getMetrics, setMetrics, type MetricsCollector } from './metrics.js';
export { getTracer, setTracer, type Tracer, type Span } from './tracing.js';
