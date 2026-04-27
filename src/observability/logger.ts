/**
 * Structured logging interface.
 *
 * The default logger is a no-op so the library stays quiet by default.
 * Consumers install their own by calling `setLogger()` — either the
 * bundled `ConsoleLogger` or an adapter around their preferred backend
 * (pino, winston, etc.).
 */

export interface Logger {
  debug(data: Record<string, unknown>, message: string): void;
  info(data: Record<string, unknown>, message: string): void;
  warn(data: Record<string, unknown>, message: string): void;
  error(data: Record<string, unknown>, message: string): void;
}

export class ConsoleLogger implements Logger {
  /* eslint-disable no-console */
  debug(data: Record<string, unknown>, message: string): void {
    console.debug(`[DEBUG] ${message}`, data);
  }

  info(data: Record<string, unknown>, message: string): void {
    console.info(`[INFO] ${message}`, data);
  }

  warn(data: Record<string, unknown>, message: string): void {
    console.warn(`[WARN] ${message}`, data);
  }

  error(data: Record<string, unknown>, message: string): void {
    console.error(`[ERROR] ${message}`, data);
  }
  /* eslint-enable no-console */
}

export class NoOpLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

let globalLogger: Logger = new NoOpLogger();

export function getLogger(): Logger {
  return globalLogger;
}

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}
