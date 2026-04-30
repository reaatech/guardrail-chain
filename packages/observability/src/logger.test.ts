import { describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, type Logger, NoOpLogger, getLogger, setLogger } from './logger.js';

describe('Logger', () => {
  it('should default to a silent NoOpLogger', () => {
    const logger = getLogger();
    expect(logger).toBeInstanceOf(NoOpLogger);
    // NoOp calls must not write to console.
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info({}, 'should be silent');
    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it('should allow setting a custom logger', () => {
    const custom: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    setLogger(custom);
    const logger = getLogger();
    logger.info({ test: true }, 'hello');
    expect(custom.info).toHaveBeenCalledWith({ test: true }, 'hello');
  });

  it('should call all log levels on custom logger', () => {
    const custom: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    setLogger(custom);
    const logger = getLogger();
    logger.debug({ level: 'debug' }, 'd');
    logger.warn({ level: 'warn' }, 'w');
    logger.error({ level: 'error' }, 'e');

    expect(custom.debug).toHaveBeenCalled();
    expect(custom.warn).toHaveBeenCalled();
    expect(custom.error).toHaveBeenCalled();
  });

  it('should call console methods on ConsoleLogger', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const logger = new ConsoleLogger();
    logger.debug({ a: 1 }, 'debug msg');
    logger.info({ a: 1 }, 'info msg');
    logger.warn({ a: 1 }, 'warn msg');
    logger.error({ a: 1 }, 'error msg');

    expect(debugSpy).toHaveBeenCalledWith('[DEBUG] debug msg', { a: 1 });
    expect(infoSpy).toHaveBeenCalledWith('[INFO] info msg', { a: 1 });
    expect(warnSpy).toHaveBeenCalledWith('[WARN] warn msg', { a: 1 });
    expect(errorSpy).toHaveBeenCalledWith('[ERROR] error msg', { a: 1 });

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
