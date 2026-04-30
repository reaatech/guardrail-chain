# AI Agent Guidelines for Guardrail Chain

This document provides guidelines for AI agents working on the Guardrail Chain monorepo. It outlines how agents should approach development tasks, interact with the codebase, and maintain consistency with project standards.

## Agent Role & Responsibilities

AI agents assisting with Guardrail Chain development should:

1. **Follow Project Conventions** — adhere to established coding standards, architecture patterns, and documentation practices
2. **Maintain Type Safety** — always use strict TypeScript typing, avoid `any` types
3. **Prioritize Testing** — write comprehensive tests with co-located `*.test.ts` files
4. **Document Thoroughly** — include JSDoc comments, update relevant documentation
5. **Consider Performance** — be mindful of latency budgets and optimization opportunities
6. **Ensure Observability** — add proper logging, metrics, and tracing support

## Project Structure

Guardrail Chain is a **pnpm monorepo** with four publishable packages under the `@reaatech` scope:

```
guardrail-chain/
├── packages/
│   ├── guardrail-chain/       → @reaatech/guardrail-chain (core)
│   ├── guardrails/            → @reaatech/guardrail-chain-guardrails
│   ├── observability/         → @reaatech/guardrail-chain-observability
│   └── config/                → @reaatech/guardrail-chain-config
├── examples/basic-usage/      → private example package
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
├── .changeset/
└── tsconfig.json              (base — extended by all packages)
```

### Package dependency graph

```
observability (no internal deps)
     ↑
guardrail-chain (depends on observability)
     ↑       ↑
guardrails  config
```

### Key conventions

- **`workspace:*`** protocol for internal package dependencies
- **Turborepo** for build orchestration (`turbo.json` defines pipeline)
- **Changesets** for versioning and changelog generation
- **Biome** for linting and formatting (single tool, no Prettier/ESLint)
- **Co-located tests** — `*.test.ts` next to source files
- **Dual ESM/CJS output** — every package builds both via tsup

## Development Workflow

### 1. Task Analysis

Before starting any development task:

- Review existing documentation (ARCHITECTURE.md, CONTRIBUTING.md)
- Understand the current package structure and dependency graph
- Identify which package(s) the change affects
- Plan the implementation approach

### 2. Implementation Guidelines

#### Code Structure

When adding a new guardrail to `packages/guardrails/src/`:

```typescript
import type { Guardrail, GuardrailResult, ChainContext } from '@reaatech/guardrail-chain';

export class MyGuardrail implements Guardrail<InputType, OutputType> {
  readonly id = 'my-guardrail';
  readonly name = 'My Guardrail';
  readonly type = 'input' as const;
  enabled = true;
  timeout = 5000;

  constructor(private config: MyConfig = {}) {}

  async execute(input: InputType, context: ChainContext): Promise<GuardrailResult<OutputType>> {
    const startTime = Date.now();

    try {
      return { passed: true, output: input, metadata: { duration: Date.now() - startTime } };
    } catch (error) {
      return {
        passed: false,
        metadata: { duration: Date.now() - startTime },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
```

Import from `@reaatech/guardrail-chain` for core types and utilities. Never use relative paths across package boundaries.

#### Testing Pattern

Tests are **co-located** next to source files as `*.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyGuardrail', () => {
  let guardrail: MyGuardrail;

  beforeEach(() => {
    guardrail = new MyGuardrail();
  });

  it('should handle valid input', async () => {
    const result = await guardrail.execute('test input', createMockContext());
    expect(result.passed).toBe(true);
  });
});
```

### 3. Quality Checks

Before completing any task:

- [ ] All tests pass (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation is updated (README.md, ARCHITECTURE.md if applicable)
- [ ] No console errors or warnings in production code

## Communication Protocol

When working on tasks, agents should:

1. **Acknowledge Understanding** — confirm understanding of requirements
2. **Ask Clarifying Questions** — if requirements are ambiguous
3. **Provide Progress Updates** — for complex or multi-step tasks
4. **Explain Decisions** — justify architectural or implementation choices
5. **Highlight Trade-offs** — discuss pros and cons of different approaches

## Error Handling

When encountering issues:

1. **Analyze Root Cause** — investigate why the error occurred
2. **Check Documentation** — review existing docs for solutions
3. **Search Codebase** — look for similar patterns or existing solutions
4. **Propose Solutions** — offer multiple approaches when possible
5. **Learn from Errors** — document lessons learned for future reference

## Project-Specific Considerations

### Budget Awareness

- All guardrails must respect latency and token budgets
- Implement proper timeout handling
- Consider performance impact of new features

### Observability

- Add structured logging with correlation IDs
- Include performance metrics via `getMetrics()`
- Support distributed tracing via `getTracer()`
- Default implementations are no-ops; consumers install adapters via `setLogger`/`setMetrics`/`setTracer`

### Error Recovery

- Implement graceful degradation
- Provide clear error messages
- Support retry logic where appropriate via `withRetry()`

### Security

- Validate all inputs
- Sanitize user-provided data
- Follow principle of least privilege

## Monorepo Tooling

| Tool | Purpose | Command |
|------|---------|---------|
| Biome | Lint + format | `pnpm lint` / `pnpm format` |
| Turbo | Build orchestration | `pnpm build` (orchestrates per-package builds) |
| Changesets | Versioning | `pnpm changeset` → PR → `pnpm version-packages` |
| tsup | Per-package build | Handled by `turbo run build` |
| Vitest | Testing | `pnpm test` (orchestrates per-package tests) |
| TypeScript | Type checking | `pnpm typecheck` (uses `tsconfig.typecheck.json`) |

## GitHub Integration

- **Username**: `reaatech`
- **Repository**: `https://github.com/reaatech/guardrail-chain`
- **Conventional Commits**: Use standard commit message format
- **Versioning**: Changesets-based, with `changesets/action` in CI

## Resources

- **Main Documentation**: ARCHITECTURE.md, CONTRIBUTING.md
- **Overview**: README.md (root + per-package READMEs)
- **Code Examples**: `examples/basic-usage/src/index.ts`
- **Type Definitions**: `packages/guardrail-chain/src/types.ts`
- **Existing Guardrails**: `packages/guardrails/src/`
- **CI Configuration**: `.github/workflows/ci.yml`

---

_This document is maintained by the development team and AI agents. Last updated: 2026-04-30_
