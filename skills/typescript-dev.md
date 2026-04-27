# Skill: TypeScript Development Best Practices

This skill covers TypeScript development best practices specific to the Guardrail Chain project.

## TypeScript Configuration

### Strict Mode Requirements

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Type Safety Guidelines

### 1. Avoid `any` Type

Never use `any`. Use proper typing:

```typescript
// ❌ Bad
function process(data: unknown) {
  return (data as { value: string }).value;
}

// ✅ Good
interface ProcessableData {
  value: string;
}

function process(data: ProcessableData): string {
  return data.value;
}

// ✅ Use unknown if type is truly dynamic
function process(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}
```

### 2. Use Type Guards

Implement type guards for type narrowing:

```typescript
// Type guard function
function isGuardrailResult<T>(result: unknown): result is GuardrailResult<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'passed' in result &&
    typeof (result as GuardrailResult<T>).passed === 'boolean'
  );
}

// Usage
function handleResult(result: unknown) {
  if (isGuardrailResult(result)) {
    console.log(result.passed); // TypeScript knows this is GuardrailResult
  }
}
```

### 3. Prefer Interfaces for Object Shapes

```typescript
// ✅ Use interfaces for object shapes
interface GuardrailConfig {
  id: string;
  type: 'input' | 'output';
  enabled: boolean;
  timeout?: number;
}

// ✅ Use type aliases for unions and primitives
type GuardrailType = 'input' | 'output';
type GuardrailId = string;

// ✅ Use type aliases for complex types
type GuardrailExecutor = (input: unknown, context: ChainContext) => Promise<GuardrailResult>;
```

### 4. Use Readonly Properties

Mark properties as `readonly` when they shouldn't change:

```typescript
class GuardrailChain {
  readonly id: string;
  readonly guardrails: readonly Guardrail[] = [];

  constructor(id: string) {
    this.id = id;
  }
}
```

### 5. Use Proper Async Types

Always specify return types for async functions:

```typescript
// ✅ Good
async function executeGuardrail(input: string): Promise<GuardrailResult> {
  // Implementation
}

// ❌ Bad - missing return type
async function executeGuardrail(input: string) {
  // Implementation
}
```

## Coding Standards

### 1. Naming Conventions

```typescript
// Use camelCase for variables and functions
const guardrailId = 'pii-redaction';
function executeChain() {}

// Use PascalCase for classes and types
class GuardrailChain {}
interface ChainContext {}
type GuardrailResult = {};

// Use UPPER_SNAKE_CASE for constants
const MAX_LATENCY_MS = 1000;
const DEFAULT_TIMEOUT = 5000;

// Use descriptive names
// ❌ Bad
const gr = new GuardrailChain();
const r = await gr.exec(input);

// ✅ Good
const chain = new GuardrailChain();
const result = await chain.execute(input);
```

### 2. Import/Export Organization

```typescript
// 1. Standard library imports
import { EventEmitter } from 'events';

// 2. Third-party imports
import { z } from 'zod';
import pino from 'pino';

// 3. Internal imports (relative paths)
import type { Guardrail, GuardrailResult } from '../core/types.js';
import { BudgetManager } from '../core/budget.js';

// 4. Type imports (use 'type' keyword)
import type { ChainContext } from '../core/context.js';

// Export organization
export { GuardrailChain } from './chain.js';
export type { Guardrail, GuardrailResult } from './types.js';
```

### 3. Error Handling

Use custom error classes:

```typescript
// Define custom error types
class GuardrailError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly guardrailId?: string,
  ) {
    super(message);
    this.name = 'GuardrailError';
  }
}

class TimeoutError extends GuardrailError {
  constructor(guardrailId: string) {
    super(`Guardrail ${guardrailId} timed out`, 'TIMEOUT', guardrailId);
    this.name = 'TimeoutError';
  }
}

// Usage
async function executeWithTimeout(guardrail: Guardrail, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await Promise.race([
      guardrail.execute(input, context),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new TimeoutError(guardrail.id));
        });
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4. JSDoc Comments

Use JSDoc for public APIs:

````typescript
/**
 * Executes a guardrail chain on the provided input.
 *
 * @param input - The input to process through the chain
 * @param options - Optional execution options
 * @returns A promise resolving to the chain result with metrics
 * @throws {TimeoutError} If execution exceeds the configured timeout
 * @throws {BudgetExceededError} If the budget is exceeded
 *
 * @example
 * ```typescript
 * const result = await chain.execute(userInput, { userId: '123' });
 * if (result.passed) {
 *   console.log('Input approved');
 * }
 * ```
 */
async execute(input: string, options?: ExecutionOptions): Promise<ChainResult> {
  // Implementation
}
````

## Performance Considerations

### 1. Avoid Unnecessary Allocations

```typescript
// ❌ Bad - creates new array on each call
function getGuardrails(): Guardrail[] {
  return [...this.guardrails];
}

// ✅ Good - return readonly view
function getGuardrails(): readonly Guardrail[] {
  return this.guardrails;
}
```

### 2. Use Proper Data Structures

```typescript
// ✅ Use Map for key-value lookups
const guardrailsById = new Map<string, Guardrail>();

// ✅ Use Set for membership testing
const enabledGuardrails = new Set<Guardrail>();

// ✅ Use arrays for ordered collections
const executionOrder: Guardrail[] = [];
```

### 3. Lazy Initialization

```typescript
class GuardrailChain {
  private _budgetManager?: BudgetManager;

  get budgetManager(): BudgetManager {
    if (!this._budgetManager) {
      this._budgetManager = new BudgetManager(this.config.budget);
    }
    return this._budgetManager;
  }
}
```

## Testing with TypeScript

### 1. Type Testing

Use TypeScript to test types:

```typescript
import { expectTypeOf } from 'vitest';

describe('Guardrail types', () => {
  it('should have correct result type', () => {
    expectTypeOf<GuardrailResult<string>>().toMatchTypeOf<{
      passed: boolean;
      output?: string;
      metadata?: { duration: number };
    }>();
  });
});
```

### 2. Mock Types Properly

```typescript
// Create typed mocks
const mockGuardrail: Guardrail<string, string> = {
  id: 'mock-guardrail',
  name: 'Mock Guardrail',
  type: 'input',
  enabled: true,
  execute: vi.fn().mockResolvedValue({ passed: true, output: 'test' }),
};

// Use type-safe test doubles
class TestGuardrail implements Guardrail<string, string> {
  readonly id = 'test-guardrail';
  readonly name = 'Test Guardrail';
  readonly type = 'input' as const;
  enabled = true;

  async execute(input: string): Promise<GuardrailResult<string>> {
    return { passed: true, output: input };
  }
}
```

## Common Patterns

### 1. Generic Guardrails

```typescript
class ValidatedGuardrail<TInput, TOutput> implements Guardrail<TInput, TOutput> {
  constructor(
    private validator: (input: TInput) => asserts input is TInput,
    private transformer: (input: TInput) => Promise<TOutput>,
  ) {}

  async execute(input: TInput, context: ChainContext): Promise<GuardrailResult<TOutput>> {
    try {
      this.validator(input);
      const output = await this.transformer(input);
      return { passed: true, output };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
```

### 2. Builder Pattern

```typescript
class ChainBuilder {
  private guardrails: Guardrail[] = [];
  private config: Partial<ChainConfig> = {};

  withGuardrail(guardrail: Guardrail): this {
    this.guardrails.push(guardrail);
    return this;
  }

  withBudget(budget: BudgetConfig): this {
    this.config.budget = budget;
    return this;
  }

  build(): GuardrailChain {
    return new GuardrailChain({
      ...this.config,
      guardrails: this.guardrails,
    } as ChainConfig);
  }
}

// Usage
const chain = new ChainBuilder()
  .withBudget({ maxLatencyMs: 1000 })
  .withGuardrail(new PIIRedaction())
  .withGuardrail(new ToxicityFilter())
  .build();
```

### 3. Factory Pattern

```typescript
interface GuardrailFactory {
  create(config: GuardrailConfig): Guardrail;
}

class GuardrailFactory implements GuardrailFactory {
  private registry = new Map<string, (config: unknown) => Guardrail>();

  register(id: string, creator: (config: unknown) => Guardrail): void {
    this.registry.set(id, creator);
  }

  create(config: GuardrailConfig): Guardrail {
    const creator = this.registry.get(config.id);
    if (!creator) {
      throw new Error(`Unknown guardrail: ${config.id}`);
    }
    return creator(config.config ?? {});
  }
}
```

## Debugging Tips

### 1. Type Inference Debugging

```typescript
// Use this trick to see inferred types
const _debug = (x: never) => x;
_debug(someVariable); // Will show error with the actual type
```

### 2. Conditional Type Debugging

```typescript
// Extract and inspect complex types
type Debug<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type GuardrailResultDebug = Debug<GuardrailResult<string>>;
```

## Related Skills

- [Testing Strategies](testing.md) — Type-safe mocking and test patterns
- [Developing Guardrails](guardrail-dev.md) — Generic guardrail patterns and builders
- [Performance Guidelines](performance.md) — Type-safe performance optimizations
- [Code Review Standards](code-review.md) — Type safety checklist

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [ESLint TypeScript Rules](https://github.com/typescript-eslint/typescript-eslint)

---

_Last updated: 2026-04-22_
