# Skill: Code Review Checklist and Standards

This skill provides a comprehensive code review checklist and standards for the Guardrail Chain project.

## Code Review Philosophy

Code reviews are essential for:

1. **Maintaining Quality**: Catch bugs and issues before they reach production
2. **Sharing Knowledge**: Spread understanding of the codebase
3. **Ensuring Consistency**: Maintain coding standards and patterns
4. **Improving Design**: Identify architectural issues and improvements
5. **Mentoring**: Help team members grow as developers

## Pre-Review Checklist

Before submitting code for review:

- [ ] All tests pass (`pnpm test`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Test coverage meets requirements (>95%)
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Commit messages follow conventional commits
- [ ] PR description is complete and accurate

## Code Review Checklist

### 1. Functionality

- [ ] **Requirements Met**: Does the code fulfill all requirements?
- [ ] **Correct Logic**: Is the business logic implemented correctly?
- [ ] **Edge Cases**: Are edge cases handled properly?
  - Empty/null inputs
  - Very large inputs
  - Invalid inputs
  - Concurrent executions
- [ ] **Error Handling**: Are errors handled gracefully?
  - Proper error messages
  - Error recovery where appropriate
  - No silent failures
- [ ] **Testing**: Are there comprehensive tests?
  - Unit tests for new functionality
  - Integration tests for complex flows
  - Tests for edge cases and error scenarios
  - Tests pass consistently

### 2. TypeScript & Type Safety

- [ ] **Strict Mode**: Is strict TypeScript mode maintained?
- [ ] **No `any` Types**: Are proper types used instead of `any`?
- [ ] **Type Inference**: Is type inference leveraged appropriately?
- [ ] **Type Guards**: Are type guards used for type narrowing?
- [ ] **Interface Design**: Are interfaces well-designed and documented?
- [ ] **Generics**: Are generics used appropriately for reusable code?
- [ ] **Type Exports**: Are types exported correctly?

```typescript
// ✅ Good - proper typing
interface GuardrailResult<TOutput = unknown> {
  passed: boolean;
  output?: TOutput;
  metadata?: { duration: number };
}

// ❌ Bad - using any
interface GuardrailResult {
  passed: boolean;
  output?: any;
  metadata?: any;
}
```

### 3. Performance

- [ ] **Latency**: Does the code meet latency requirements?
  - Guardrail execution < 10ms overhead (excluding external calls)
  - Chain execution < 100ms for 3 guardrails
- [ ] **Memory**: Is memory usage optimized?
  - No memory leaks
  - Proper cleanup of resources
  - Efficient data structures
- [ ] **Caching**: Is caching used appropriately?
  - Cache keys are well-designed
  - TTL is configured
  - Cache invalidation is handled
- [ ] **Async Operations**: Are async operations optimized?
  - Parallel execution where possible
  - Proper use of Promise.all
  - No unnecessary sequential operations

```typescript
// ✅ Good - parallel execution
const results = await Promise.all([
  guardrail1.execute(input),
  guardrail2.execute(input),
  guardrail3.execute(input),
]);

// ❌ Bad - sequential execution
const result1 = await guardrail1.execute(input);
const result2 = await guardrail2.execute(input);
const result3 = await guardrail3.execute(input);
```

### 4. Security

- [ ] **Input Validation**: Is all input validated?
  - Type checking
  - Length limits
  - Format validation
- [ ] **Sanitization**: Is user input properly sanitized?
  - PII redaction
  - XSS prevention
  - SQL injection prevention (if applicable)
- [ ] **Error Messages**: Do error messages avoid leaking sensitive information?
- [ ] **Dependencies**: Are dependencies up-to-date and secure?
- [ ] **Rate Limiting**: Is rate limiting implemented where needed?
- [ ] **Authentication/Authorization**: Are access controls properly implemented?

### 5. Observability

- [ ] **Logging**: Is proper logging implemented?
  - Structured logging with correlation IDs
  - Appropriate log levels (debug, info, warn, error)
  - No sensitive data in logs
- [ ] **Metrics**: Are relevant metrics collected?
  - Execution duration
  - Success/failure rates
  - Budget usage
- [ ] **Tracing**: Is distributed tracing supported?
  - Span creation for guardrail execution
  - Context propagation
  - Trace ID in logs

```typescript
// ✅ Good - comprehensive observability
async execute(input: string, context: ChainContext): Promise<GuardrailResult> {
  const startTime = Date.now();

  this.logger.debug({
    event: 'guardrail_start',
    guardrailId: this.id,
    correlationId: context.correlationId,
    inputLength: input.length
  });

  try {
    const result = await this.process(input);

    this.logger.info({
      event: 'guardrail_complete',
      guardrailId: this.id,
      correlationId: context.correlationId,
      passed: result.passed,
      duration: Date.now() - startTime
    });

    return result;
  } catch (error) {
    this.logger.error({
      event: 'guardrail_error',
      guardrailId: this.id,
      correlationId: context.correlationId,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}
```

### 6. Code Quality

- [ ] **Readability**: Is the code easy to understand?
  - Clear variable names
  - Consistent formatting
  - Appropriate comments
- [ ] **Maintainability**: Is the code easy to maintain?
  - Single responsibility principle
  - DRY (Don't Repeat Yourself)
  - Separation of concerns
- [ ] **Modularity**: Is the code well-organized?
  - Logical file structure
  - Clear dependencies
  - Proper encapsulation
- [ ] **Complexity**: Is complexity managed appropriately?
  - No deeply nested code
  - No overly long functions
  - No complex conditional logic

### 7. Documentation

- [ ] **JSDoc**: Are public APIs documented with JSDoc?
  - Function descriptions
  - Parameter documentation
  - Return type documentation
  - Usage examples
- [ ] **Comments**: Are complex sections commented?
  - Why, not what
  - Algorithm explanations
  - Non-obvious optimizations
- [ ] **README**: Is the README updated?
  - New features documented
  - Examples provided
  - Configuration options documented
- [ ] **Type Documentation**: Are types properly documented?
  - Interface descriptions
  - Type alias explanations
  - Enum value documentation

### 8. Testing

- [ ] **Coverage**: Does the code meet coverage requirements?
  - > 95% line coverage
  - > 90% branch coverage
- [ ] **Test Quality**: Are tests well-written?
  - Descriptive test names
  - Isolated tests
  - No test interdependencies
  - Proper use of mocks and stubs
- [ ] **Test Coverage**: Do tests cover all scenarios?
  - Happy paths
  - Error paths
  - Edge cases
  - Boundary conditions
- [ ] **Test Performance**: Do tests run quickly?
  - No slow tests in unit test suite
  - Proper use of test fixtures
  - Efficient test setup/teardown

### 9. Configuration

- [ ] **Defaults**: Are sensible defaults provided?
- [ ] **Validation**: Is configuration validated?
- [ ] **Documentation**: Is configuration documented?
- [ ] **Environment Variables**: Are environment variables used appropriately?
- [ ] **Feature Flags**: Are feature flags implemented for gradual rollout?

### 10. Error Handling

- [ ] **Error Types**: Are custom error types used?
- [ ] **Error Messages**: Are error messages clear and actionable?
- [ ] **Error Recovery**: Is error recovery implemented where appropriate?
- [ ] **Error Logging**: Are errors properly logged?
- [ ] **User Feedback**: Is appropriate user feedback provided?

## Review Process

### 1. Initial Review

1. **Read the PR description**: Understand the context and goals
2. **Check the diff**: Review the changes at a high level
3. **Run the code**: Test the changes locally if needed
4. **Review tests**: Ensure tests are comprehensive

### 2. Detailed Review

1. **Functionality**: Verify the code works as intended
2. **Code quality**: Check for readability and maintainability
3. **Performance**: Look for performance issues
4. **Security**: Identify potential security vulnerabilities
5. **Documentation**: Ensure documentation is complete

### 3. Feedback

Provide constructive feedback:

- **Be specific**: Point to exact lines or sections
- **Be constructive**: Suggest improvements, not just criticisms
- **Be respectful**: Remember there's a person behind the code
- **Be timely**: Review within 24 hours when possible

### 4. Approval

- **Approve**: When all concerns are addressed
- **Request changes**: When significant issues remain
- **Comment**: For minor suggestions or questions

## Common Issues to Watch For

### 1. Type Safety Issues

```typescript
// ❌ Avoid implicit any
function process(data) {
  return data.value;
}

// ✅ Use proper typing
function process(data: { value: string }): string {
  return data.value;
}
```

### 2. Error Handling Issues

```typescript
// ❌ Swallowing errors
try {
  await doSomething();
} catch (error) {
  // Empty catch block
}

// ✅ Proper error handling
try {
  await doSomething();
} catch (error) {
  logger.error({ error }, 'Failed to do something');
  throw new ProcessingError('Failed to process input', { cause: error });
}
```

### 3. Performance Issues

```typescript
// ❌ Inefficient loop
for (let i = 0; i < array.length; i++) {
  if (array[i].id === targetId) {
    return array[i];
  }
}

// ✅ Use find
return array.find((item) => item.id === targetId);
```

### 4. Memory Issues

```typescript
// ❌ Memory leak - not cleaning up
class GuardrailChain {
  private listeners: Function[] = [];

  addListener(fn: Function) {
    this.listeners.push(fn);
  }
}

// ✅ Proper cleanup
class GuardrailChain {
  private listeners: Function[] = [];

  addListener(fn: Function) {
    this.listeners.push(fn);
  }

  destroy() {
    this.listeners = [];
  }
}
```

### 5. Security Issues

```typescript
// ❌ Logging sensitive data
logger.info({ input: userInput }, 'Processing input');

// ✅ Sanitize before logging
logger.info(
  {
    inputLength: userInput.length,
    hasPII: containsPII(userInput),
  },
  'Processing input',
);
```

## Review Templates

### PR Review Template

```markdown
## Code Review

### Summary

[Brief summary of the changes and overall impression]

### Functionality

- [ ] Requirements met
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Error handling is proper

### Code Quality

- [ ] Code is readable and maintainable
- [ ] TypeScript types are correct
- [ ] Performance is acceptable
- [ ] Security considerations addressed

### Testing

- [ ] Tests are comprehensive
- [ ] Coverage meets requirements
- [ ] Tests pass consistently

### Documentation

- [ ] JSDoc comments are complete
- [ ] README is updated
- [ ] Configuration is documented

### Concerns

[List any specific concerns or issues]

### Suggestions

[List any suggestions for improvement]

### Approval

- [ ] Approved
- [ ] Request changes
- [ ] Comment only
```

## Related Skills

- [TypeScript Best Practices](typescript-dev.md) — Type safety and coding standards
- [Testing Strategies](testing.md) — Test quality checklist
- [Performance Guidelines](performance.md) — Performance review criteria
- [Security Best Practices](security.md) — Security review checklist
- [Documentation](documentation.md) — Documentation completeness checks

## Resources

- [Google Code Review Guide](https://google.github.io/eng-practices/review/)
- [GitHub Code Review Guidelines](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests)
- [TypeScript Best Practices](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md)

---

_Last updated: 2026-04-22_
