# AI Agent Guidelines for Guardrail Chain

This document provides guidelines for AI agents (like Kimi, Cline, etc.) working on the Guardrail Chain project. It outlines how agents should approach development tasks, interact with the codebase, and maintain consistency with project standards.

## Agent Role & Responsibilities

AI agents assisting with Guardrail Chain development should:

1. **Follow Project Conventions**: Adhere to established coding standards, architecture patterns, and documentation practices
2. **Maintain Type Safety**: Always use strict TypeScript typing, avoid `any` types
3. **Prioritize Testing**: Write comprehensive tests with >95% coverage target
4. **Document Thoroughly**: Include JSDoc comments, update relevant documentation
5. **Consider Performance**: Be mindful of latency budgets and optimization opportunities
6. **Ensure Observability**: Add proper logging, metrics, and tracing support

## Development Workflow

### 1. Task Analysis

Before starting any development task:

- Review existing documentation (ARCHITECTURE.md, DEV_PLAN.md, CONTRIBUTING.md)
- Understand the current project structure and patterns
- Identify related files and dependencies
- Plan the implementation approach

### 2. Implementation Guidelines

#### Code Structure

```typescript
// Follow this pattern for new guardrails
import type { Guardrail, GuardrailResult, ChainContext } from '../core/types.js';

export class MyGuardrail implements Guardrail<InputType, OutputType> {
  readonly id = 'my-guardrail';
  readonly name = 'My Guardrail';
  readonly type = 'input' as const; // or 'output'
  enabled = true;
  timeout = 5000;

  constructor(private config: MyConfig = {}) {}

  async execute(input: InputType, context: ChainContext): Promise<GuardrailResult<OutputType>> {
    const startTime = Date.now();

    try {
      // Implementation
      return { passed: true, output: result, metadata: { duration: Date.now() - startTime } };
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

#### Testing Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyGuardrail', () => {
  let guardrail: MyGuardrail;

  beforeEach(() => {
    guardrail = new MyGuardrail();
  });

  it('should handle valid input', async () => {
    // Test implementation
  });
});
```

### 3. Quality Checks

Before completing any task:

- [ ] All tests pass (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Documentation is updated
- [ ] No console errors or warnings

## Agent Skills

Agents have access to specialized skills located in the `skills/` directory:

- **`project-context.md`**: Understanding project structure and architecture
- **`typescript-dev.md`**: TypeScript development best practices
- **`testing.md`**: Testing strategies and patterns
- **`guardrail-dev.md`**: Developing new guardrails
- **`documentation.md`**: Writing and updating documentation
- **`code-review.md`**: Code review checklist and standards
- **`performance.md`**: Performance optimization guidelines
- **`security.md`**: Security considerations and best practices

## Communication Protocol

When working on tasks, agents should:

1. **Acknowledge Understanding**: Confirm understanding of requirements
2. **Ask Clarifying Questions**: If requirements are ambiguous
3. **Provide Progress Updates**: For complex or multi-step tasks
4. **Explain Decisions**: Justify architectural or implementation choices
5. **Highlight Trade-offs**: Discuss pros and cons of different approaches

## Error Handling

When encountering issues:

1. **Analyze Root Cause**: Investigate why the error occurred
2. **Check Documentation**: Review existing docs for solutions
3. **Search Codebase**: Look for similar patterns or existing solutions
4. **Propose Solutions**: Offer multiple approaches when possible
5. **Learn from Errors**: Document lessons learned for future reference

## Project-Specific Considerations

### Budget Awareness

- All guardrails must respect latency and token budgets
- Implement proper timeout handling
- Consider performance impact of new features

### Observability

- Add structured logging with correlation IDs
- Include performance metrics
- Support distributed tracing

### Error Recovery

- Implement graceful degradation
- Provide clear error messages
- Support retry logic where appropriate

### Security

- Validate all inputs
- Sanitize user-provided data
- Follow principle of least privilege

## GitHub Integration

- **Username**: `reaatech`
- **Repository**: `https://github.com/reaatech/guardrail-chain`
- **Conventional Commits**: Use standard commit message format
- **PR Templates**: Follow PR description templates from CONTRIBUTING.md

## Continuous Learning

Agents should:

- Stay updated on project changes and evolution
- Learn from code reviews and feedback
- Adapt to new patterns and best practices
- Contribute to improving development processes

## Resources

- **Main Documentation**: ARCHITECTURE.md, DEV_PLAN.md, CONTRIBUTING.md
- **Human-Facing Overview**: README.md (check for public API changes)
- **Code Examples**: Check `examples/` directory
- **Type Definitions**: Review `src/core/types.ts`
- **Existing Guardrails**: Study implementations in `src/guardrails/`

---

_This document is maintained by the development team and AI agents. Last updated: 2026-04-22_
