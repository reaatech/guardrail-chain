/**
 * Metrics collection interface.
 */

export interface MetricsCollector {
  increment(name: string, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
}

class NoOpMetrics implements MetricsCollector {
  increment(): void {}
  histogram(): void {}
  gauge(): void {}
}

let globalMetrics: MetricsCollector = new NoOpMetrics();

export function getMetrics(): MetricsCollector {
  return globalMetrics;
}

export function setMetrics(metrics: MetricsCollector): void {
  globalMetrics = metrics;
}
