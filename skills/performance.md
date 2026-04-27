# Skill: Performance Optimization Guidelines

This skill covers performance optimization strategies and best practices for the Guardrail Chain project.

## Performance Goals

The Guardrail Chain project has specific performance targets:

| Metric                         | Target         | Maximum        |
| ------------------------------ | -------------- | -------------- |
| Guardrail overhead             | < 5ms          | < 10ms         |
| Chain execution (3 guardrails) | < 50ms         | < 100ms        |
| Memory footprint               | < 30MB         | < 50MB         |
| Bundle size (core)             | < 30KB gzipped | < 50KB gzipped |
| Cold start time                | < 100ms        | < 200ms        |

## Performance Principles

1. **Measure First**: Profile before optimizing
2. **Focus on Hot Paths**: Optimize frequently executed code
3. **Avoid Premature Optimization**: Keep code simple until bottlenecks are identified
4. **Consider Trade-offs**: Balance performance with readability and maintainability
5. **Test Under Load**: Verify performance under realistic conditions

## Optimization Strategies

### 1. Algorithm Optimization

```typescript
// ❌ Bad - O(n²) complexity
function findDuplicates(arr: string[]): string[] {
  const duplicates: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

// ✅ Good - O(n) complexity
function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return Array.from(duplicates);
}
```

### 2. Memory Optimization

```typescript
// ❌ Bad - creates unnecessary objects
function processInputs(inputs: string[]): ProcessedInput[] {
  const results: ProcessedInput[] = [];

  for (const input of inputs) {
    // Creates new object on each iteration
    const processed = {
      original: input,
      processed: input.trim().toLowerCase(),
      length: input.length,
      words: input.split(' ').length,
    };
    results.push(processed);
  }

  return results;
}

// ✅ Good - reuses objects where possible
function processInputs(inputs: string[]): ProcessedInput[] {
  return inputs.map((input) => ({
    original: input,
    processed: input.trim().toLowerCase(),
    length: input.length,
    words: input.split(' ').length,
  }));
}
```

### 3. Caching Strategies

```typescript
// ✅ Good - LRU cache for expensive operations
class CachedGuardrail implements Guardrail<string, string> {
  private cache: LRUCache<string, GuardrailResult<string>>;
  private readonly ttl: number;

  constructor(config: CacheConfig) {
    this.cache = new LRUCache({
      max: config.maxSize || 1000,
      ttl: config.ttl || 3600000, // 1 hour default
    });
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const cacheKey = this.generateCacheKey(input);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          fromCache: true,
        },
      };
    }

    // Execute and cache result
    const result = await this.wrappedGuardrail.execute(input, context);
    if (result.passed) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  private generateCacheKey(input: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return `${this.wrappedGuardrail.id}:${hash}`;
  }
}
```

### 4. Lazy Loading

```typescript
// ✅ Good - lazy load expensive dependencies
class LazyGuardrail implements Guardrail<string, string> {
  private _analyzer?: TextAnalyzer;

  private get analyzer(): TextAnalyzer {
    if (!this._analyzer) {
      // Lazy initialization - only load when needed
      this._analyzer = new TextAnalyzer();
    }
    return this._analyzer;
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    // Quick pre-check before loading analyzer
    if (input.length < 10) {
      return { passed: true, output: input, metadata: { duration: 0 } };
    }

    // Now load and use analyzer
    const analysis = await this.analyzer.analyze(input);
    return {
      passed: analysis.safe,
      output: input,
      metadata: { analysis },
    };
  }
}
```

### 5. Parallel Execution

```typescript
// ✅ Good - execute independent guardrails in parallel
async executeParallel(
  guardrails: Guardrail[],
  input: string,
  context: ChainContext
): Promise<GuardrailResult[]> {
  // Group guardrails by dependencies
  const independentGroups = this.groupByDependencies(guardrails);

  const results: GuardrailResult[] = [];

  for (const group of independentGroups) {
    // Execute independent guardrails in parallel
    const groupResults = await Promise.allSettled(
      group.map(guardrail => guardrail.execute(input, context))
    );

    // Process results
    for (const result of groupResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          passed: false,
          error: result.reason
        });
      }
    }

    // Check for short-circuit conditions
    if (results.some(r => !r.passed)) {
      break;
    }
  }

  return results;
}
```

### 6. Streaming for Large Inputs

```typescript
// ✅ Good - process large inputs in chunks
async function processLargeInput(
  input: string,
  chunkSize: number = 10000,
): Promise<GuardrailResult> {
  if (input.length <= chunkSize) {
    return processChunk(input);
  }

  // Process in chunks
  const chunks = splitIntoChunks(input, chunkSize);
  const results: GuardrailResult[] = [];

  for (const chunk of chunks) {
    const result = await processChunk(chunk);
    results.push(result);

    // Early exit if any chunk fails
    if (!result.passed) {
      return result;
    }
  }

  return {
    passed: true,
    output: input,
    metadata: {
      chunksProcessed: chunks.length,
      results,
    },
  };
}

function splitIntoChunks(str: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}
```

## Performance Monitoring

### 1. Performance Metrics

```typescript
// Performance monitoring class
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  record(guardrailId: string, duration: number): void {
    if (!this.metrics.has(guardrailId)) {
      this.metrics.set(guardrailId, []);
    }
    this.metrics.get(guardrailId)!.push(duration);

    // Keep only last 1000 measurements
    const data = this.metrics.get(guardrailId)!;
    if (data.length > 1000) {
      data.shift();
    }
  }

  getStats(guardrailId: string): PerformanceStats {
    const data = this.metrics.get(guardrailId) || [];
    if (data.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);

    return {
      count: data.length,
      avg: sum / data.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }
}

interface PerformanceStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
}
```

### 2. Budget Tracking

```typescript
// ✅ Good - track and enforce budget limits
class BudgetTracker {
  private usedLatency = 0;
  private usedTokens = 0;
  private readonly maxLatency: number;
  private readonly maxTokens: number;

  constructor(config: BudgetConfig) {
    this.maxLatency = config.maxLatencyMs;
    this.maxTokens = config.maxTokens;
  }

  canExecute(estimatedCost: number): boolean {
    return this.usedLatency + estimatedCost <= this.maxLatency;
  }

  recordExecution(duration: number, tokens?: number): void {
    this.usedLatency += duration;
    if (tokens) {
      this.usedTokens += tokens;
    }
  }

  getRemaining(): BudgetState {
    return {
      remainingLatency: Math.max(0, this.maxLatency - this.usedLatency),
      remainingTokens: Math.max(0, this.maxTokens - this.usedTokens),
      usedLatency: this.usedLatency,
      usedTokens: this.usedTokens,
    };
  }

  isExceeded(): boolean {
    return this.usedLatency > this.maxLatency || this.usedTokens > this.maxTokens;
  }
}
```

## Performance Testing

### 1. Benchmark Tests

```typescript
import { describe, it, expect } from 'vitest';
import { PIIRedaction } from '../src/guardrails/input/pii-redaction.js';

describe('Performance Benchmarks', () => {
  it('should process PII redaction within latency budget', async () => {
    const guardrail = new PIIRedaction();
    const context = createMockContext();
    const input = 'My email is test@example.com and phone is 555-123-4567';

    // Warm up
    for (let i = 0; i < 10; i++) {
      await guardrail.execute(input, context);
    }

    // Benchmark
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await guardrail.execute(input, context);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const maxTime = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    console.log(`Average: ${avgTime.toFixed(2)}ms`);
    console.log(`P95: ${p95.toFixed(2)}ms`);
    console.log(`Max: ${maxTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(50); // Average < 50ms
    expect(p95).toBeLessThan(100); // P95 < 100ms
  });
});
```

### 2. Load Testing

```typescript
import { describe, it, expect } from 'vitest';
import { GuardrailChain } from '../src/core/chain.js';

describe('Load Testing', () => {
  it('should handle high concurrency', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 1000, maxTokens: 4000 },
    });

    const concurrentRequests = 100;
    const start = performance.now();

    const promises = Array(concurrentRequests)
      .fill('Test input with email: user@example.com')
      .map((input) => chain.execute(input));

    const results = await Promise.all(promises);
    const end = performance.now();

    const totalTime = end - start;
    const avgTime = totalTime / concurrentRequests;

    expect(results).toHaveLength(concurrentRequests);
    expect(totalTime).toBeLessThan(5000); // Total < 5 seconds
    expect(avgTime).toBeLessThan(100); // Average < 100ms per request
  });

  it('should maintain performance under sustained load', async () => {
    const chain = new GuardrailChain({
      budget: { maxLatencyMs: 1000, maxTokens: 4000 },
    });

    const sustainedRequests = 1000;
    const times: number[] = [];

    for (let i = 0; i < sustainedRequests; i++) {
      const start = performance.now();
      await chain.execute('Test input');
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    expect(avgTime).toBeLessThan(100);
    expect(p95).toBeLessThan(200);
  });
});
```

## Common Performance Pitfalls

### 1. Regex Performance

```typescript
// ❌ Bad - catastrophic backtracking
const badPattern = /(a+)+b/;

// ✅ Good - optimized regex
const goodPattern = /a+b/;

// ✅ Better - use specific patterns
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const phonePattern = /\+?[\d\s-]{10,}/g;
```

### 2. Array Operations

```typescript
// ❌ Bad - multiple iterations
function processData(data: any[]): ProcessedData[] {
  const filtered = data.filter((item) => item.active);
  const mapped = filtered.map((item) => transform(item));
  const sorted = mapped.sort((a, b) => a.priority - b.priority);
  return sorted;
}

// ✅ Good - single iteration
function processData(data: Item[]): ProcessedData[] {
  return data
    .filter((item) => item.active)
    .map((item) => transform(item))
    .sort((a, b) => a.priority - b.priority);
}
```

### 3. String Concatenation

```typescript
// ❌ Bad - creates many intermediate strings
let result = '';
for (const item of items) {
  result = result + item + ', ';
}

// ✅ Good - use join
const result = items.join(', ');

// ✅ Better for large datasets - use array
const parts: string[] = [];
for (const item of items) {
  parts.push(item);
}
const result = parts.join(', ');
```

### 4. Object Creation

```typescript
// ❌ Bad - creates new objects unnecessarily
function getConfig(): Config {
  return {
    timeout: 5000,
    retries: 3,
    enabled: true,
  };
}

// ✅ Good - reuse static config
const DEFAULT_CONFIG: Config = {
  timeout: 5000,
  retries: 3,
  enabled: true,
};

function getConfig(): Config {
  return DEFAULT_CONFIG;
}
```

## Performance Optimization Checklist

Before deploying:

- [ ] Profile the application to identify bottlenecks
- [ ] Optimize hot paths (frequently executed code)
- [ ] Implement caching for expensive operations
- [ ] Use appropriate data structures
- [ ] Minimize memory allocations
- [ ] Optimize regex patterns
- [ ] Use parallel execution where possible
- [ ] Implement lazy loading for heavy dependencies
- [ ] Add performance monitoring
- [ ] Run load tests
- [ ] Verify bundle size is within limits
- [ ] Test cold start performance

## Tools and Resources

### Profiling Tools

- **Node.js Profiler**: Built-in profiler for Node.js
- **Chrome DevTools**: For browser-based profiling
- **clinic.js**: Node.js performance diagnostic tool
- **0x**: Standalone flame graph visualizer

### Benchmarking Libraries

```json
{
  "devDependencies": {
    "benchmark": "^2.1.4",
    "vitest": "^1.0.0"
  }
}
```

### Performance Monitoring

```typescript
// Performance monitoring setup
import { performance } from 'perf_hooks';

function measureExecution<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return {
    result,
    duration: end - start,
  };
}
```

## Related Skills

- [Developing Guardrails](guardrail-dev.md) — Performance-conscious guardrail patterns
- [TypeScript Best Practices](typescript-dev.md) — Type-safe optimizations
- [Testing Strategies](testing.md) — Benchmark and load testing
- [Security Best Practices](security.md) — Secure performance patterns

## Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling)
- [V8 Performance Tips](https://v8.dev/docs/fast)
- [Web Performance Fundamentals](https://web.dev/performance/)

---

_Last updated: 2026-04-22_
