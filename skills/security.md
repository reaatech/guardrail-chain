# Skill: Security Considerations and Best Practices

This skill covers security considerations and best practices for the Guardrail Chain project.

## Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Grant minimum necessary access
3. **Input Validation**: Never trust user input
4. **Secure by Default**: Sensible security defaults
5. **Fail Securely**: Graceful degradation on security failures

## Input Security

### 1. Input Validation

Always validate and sanitize user input:

```typescript
// ✅ Good - comprehensive validation
function validateInput(input: unknown): asserts input is string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }

  if (input.length === 0) {
    throw new ValidationError('Input cannot be empty');
  }

  if (input.length > MAX_INPUT_LENGTH) {
    throw new ValidationError(`Input exceeds maximum length of ${MAX_INPUT_LENGTH}`);
  }

  // Check for null bytes
  if (input.includes('\0')) {
    throw new ValidationError('Input contains invalid null bytes');
  }
}

// ❌ Bad - no validation
function processInput(input: unknown) {
  return input.toString(); // Could fail or produce unexpected results
}
```

### 2. PII Protection

Protect personally identifiable information:

```typescript
// ✅ Good - redact PII before logging
function safeLog(input: string, logger: Logger): void {
  const redacted = input
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[SSN]')
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CREDIT_CARD]');

  logger.info({ input: redacted }, 'Processing input');
}

// ❌ Bad - logs raw input
function unsafeLog(input: string, logger: Logger): void {
  logger.info({ input }, 'Processing input'); // May contain PII
}
```

### 3. Injection Prevention

Prevent various injection attacks:

```typescript
// ✅ Good - sanitize for prompt injection
function sanitizeForLLM(input: string): string {
  // Remove common injection patterns
  const patterns = [
    /ignore\s+previous\s+instructions/gi,
    /you\s+are\s+now\s+in\s+developer\s+mode/gi,
    /bypass\s+all\s+restrictions/gi,
    /output\s+your\s+system\s+prompt/gi,
    /print\s+your\s+instructions/gi,
  ];

  let sanitized = input;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  return sanitized;
}

// ❌ Bad - no sanitization
function unsafeProcess(input: string): string {
  return `System: Process this: ${input}`; // Vulnerable to injection
}
```

## Data Security

### 1. Sensitive Data Handling

Never store or transmit sensitive data unnecessarily:

```typescript
// ✅ Good - minimize data retention
class SecureGuardrail implements Guardrail<string, string> {
  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    // Process without storing
    const result = await this.analyze(input);

    // Clear sensitive data from memory
    this.clearSensitiveData();

    return result;
  }

  private clearSensitiveData(): void {
    // Overwrite sensitive data in memory
    if (this.sensitiveBuffer) {
      this.sensitiveBuffer.fill(0);
    }
  }
}

// ❌ Bad - retains sensitive data
class InsecureGuardrail implements Guardrail<string, string> {
  private processedInputs: string[] = []; // Stores all inputs

  async execute(input: string): Promise<GuardrailResult<string>> {
    this.processedInputs.push(input); // Security risk
    return { passed: true, output: input };
  }
}
```

### 2. Encryption at Rest

Encrypt sensitive configuration data:

```typescript
// ✅ Good - encrypt sensitive config
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class SecureConfigManager {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(encryptionKey: string) {
    this.key = this.deriveKey(encryptionKey);
  }

  encrypt(data: string): EncryptedData {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    };
  }

  decrypt(encrypted: EncryptedData): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private deriveKey(password: string): Buffer {
    // Use proper key derivation
    return crypto.scryptSync(password, 'salt', 32);
  }
}

interface EncryptedData {
  iv: string;
  authTag: string;
  data: string;
}
```

## API Security

### 1. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// ✅ Good - rate limiting guardrail
class RateLimiter implements Guardrail<string, string> {
  private readonly requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs || 60000; // 1 minute default
    this.maxRequests = config.maxRequests || 100;
  }

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    const clientId = context.userId || context.sessionId || 'anonymous';
    const now = Date.now();

    // Get request history for this client
    const requestTimes = this.requests.get(clientId) || [];

    // Remove old requests outside the window
    const recentRequests = requestTimes.filter((time) => now - time < this.windowMs);

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return {
        passed: false,
        error: new RateLimitError(
          `Rate limit exceeded. Max ${this.maxRequests} requests per ${this.windowMs / 1000}s`,
        ),
      };
    }

    // Record this request
    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      this.cleanup();
    }

    return { passed: true, output: input };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [clientId, times] of this.requests.entries()) {
      const recent = times.filter((t) => now - t < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, recent);
      }
    }
  }
}

interface RateLimiterConfig {
  windowMs?: number;
  maxRequests?: number;
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

### 2. Authentication and Authorization

Implement proper access controls:

```typescript
// ✅ Good - authentication middleware
interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

class AuthGuardrail implements Guardrail<string, string> {
  constructor(
    private authProvider: AuthProvider,
    private requiredPermissions: string[] = [],
  ) {}

  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    // Verify authentication
    const authContext = await this.authProvider.authenticate(context);
    if (!authContext) {
      return {
        passed: false,
        error: new AuthenticationError('Authentication required'),
      };
    }

    // Check authorization
    if (this.requiredPermissions.length > 0) {
      const hasPermission = this.requiredPermissions.every((perm) =>
        authContext.permissions.includes(perm),
      );

      if (!hasPermission) {
        return {
          passed: false,
          error: new AuthorizationError('Insufficient permissions'),
        };
      }
    }

    // Add auth context to chain context
    context.userId = authContext.userId;

    return { passed: true, output: input };
  }
}
```

## Dependency Security

### 1. Dependency Management

Keep dependencies secure and up-to-date:

```json
{
  "scripts": {
    "security:check": "npm audit --audit-level=high",
    "security:update": "npm audit fix",
    "deps:check": "npm-check-updates",
    "deps:update": "npm-check-updates -u && npm install"
  },
  "devDependencies": {
    "npm-audit-ci-wrapper": "^3.0.2",
    "npm-check-updates": "^16.14.0"
  }
}
```

### 2. Supply Chain Security

Verify dependency integrity:

```bash
# Use lockfiles
npm ci --ignore-scripts

# Verify package integrity
npm audit

# Check for known vulnerabilities
npx snyk test

# Use provenance verification (npm v9+)
npm ci --include-workspace-root
```

## Logging Security

### 1. Secure Logging

Never log sensitive information:

```typescript
// ✅ Good - secure logging
class SecureLogger {
  private readonly sensitivePatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card
    /password/i, // Password field
    /token/i, // Token field
    /secret/i, // Secret field
  ];

  info(data: unknown, message: string): void {
    const sanitized = this.sanitize(data);
    console.log(`[INFO] ${message}`, sanitized);
  }

  private sanitize(data: unknown): unknown {
    const str = JSON.stringify(data);
    let sanitized = str;

    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return JSON.parse(sanitized);
  }
}

// ❌ Bad - insecure logging
class InsecureLogger {
  info(data: any, message: string): void {
    console.log(`[INFO] ${message}`, data); // May contain sensitive data
  }
}
```

### 2. Log Levels

Use appropriate log levels:

```typescript
// ✅ Good - proper log levels
async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
  const startTime = Date.now();

  // Debug: Detailed information for debugging
  this.logger.debug({
    guardrailId: this.id,
    correlationId: context.correlationId,
    inputLength: input.length
  }, 'Starting guardrail execution');

  try {
    const result = await this.process(input);

    // Info: General operational information
    this.logger.info({
      guardrailId: this.id,
      correlationId: context.correlationId,
      passed: result.passed,
      duration: Date.now() - startTime
    }, 'Guardrail execution completed');

    return result;
  } catch (error) {
    // Error: Error information
    this.logger.error({
      guardrailId: this.id,
      correlationId: context.correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Guardrail execution failed');

    throw error;
  }
}
```

## Error Handling Security

### 1. Secure Error Messages

Don't leak sensitive information in error messages:

```typescript
// ✅ Good - secure error messages
class SecureErrorHandler {
  handleError(error: Error, context: ChainContext): ErrorResponse {
    // Log full error internally
    this.logger.error(
      {
        error: error.message,
        stack: error.stack,
        correlationId: context.correlationId,
      },
      'Error occurred',
    );

    // Return generic error to user
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again later.',
        correlationId: context.correlationId,
      },
    };
  }
}

// ❌ Bad - leaks sensitive information
class InsecureErrorHandler {
  handleError(error: Error, context: ChainContext): ErrorResponse {
    return {
      success: false,
      error: {
        code: 'ERROR',
        message: error.message, // May contain sensitive info
        stack: error.stack, // Leaks internal structure
        config: this.config, // Leaks configuration
      },
    };
  }
}
```

### 2. Fail Securely

Implement secure failure modes:

```typescript
// ✅ Good - fail securely
class SecureGuardrail implements Guardrail<string, string> {
  async execute(input: string, context: ChainContext): Promise<GuardrailResult<string>> {
    try {
      return await this.process(input);
    } catch (error) {
      // Fail closed - reject on error
      if (this.config.failOpen === false) {
        return {
          passed: false,
          error: new Error('Security check failed'),
        };
      }

      // Fail open only if explicitly configured and safe
      if (this.config.failOpen === true && this.isSafeToFailOpen(error)) {
        return {
          passed: true,
          output: input,
          metadata: {
            failedOpen: true,
            reason: error instanceof Error ? error.message : String(error),
          },
        };
      }

      // Default: fail closed
      return {
        passed: false,
        error: new Error('Security check failed'),
      };
    }
  }

  private isSafeToFailOpen(error: Error): boolean {
    // Only fail open for specific, safe error types
    return error instanceof TimeoutError || error instanceof ServiceUnavailableError;
  }
}
```

## Security Testing

### 1. Security Test Cases

```typescript
import { describe, it, expect } from 'vitest';
import { PIIRedaction } from '../src/guardrails/input/pii-redaction.js';

describe('Security Tests', () => {
  describe('PII Protection', () => {
    it('should redact email addresses', async () => {
      const guardrail = new PIIRedaction();
      const input = 'Contact me at john.doe@example.com';

      const result = await guardrail.execute(input, createMockContext());

      expect(result.output).not.toContain('john.doe@example.com');
      expect(result.output).toContain('[EMAIL]');
    });

    it('should redact SSN', async () => {
      const guardrail = new PIIRedaction();
      const input = 'My SSN is 123-45-6789';

      const result = await guardrail.execute(input, createMockContext());

      expect(result.output).not.toContain('123-45-6789');
      expect(result.output).toContain('[SSN]');
    });

    it('should not log sensitive data', async () => {
      const guardrail = new PIIRedaction();
      const input = 'My email is secret@example.com';

      // Mock logger to capture logs
      const logs: unknown[] = [];
      const mockLogger = {
        info: (data: unknown) => logs.push(data),
        error: (data: unknown) => logs.push(data),
      };

      await guardrail.execute(input, createMockContext());

      // Verify no PII in logs
      const logStr = JSON.stringify(logs);
      expect(logStr).not.toContain('secret@example.com');
    });
  });

  describe('Input Validation', () => {
    it('should reject null bytes', async () => {
      const guardrail = new InputValidator();
      const input = 'valid\0invalid';

      const result = await guardrail.execute(input, createMockContext());

      expect(result.passed).toBe(false);
    });

    it('should reject excessively long input', async () => {
      const guardrail = new InputValidator({ maxLength: 1000 });
      const input = 'a'.repeat(10001);

      const result = await guardrail.execute(input, createMockContext());

      expect(result.passed).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const guardrail = new RateLimiter({
        windowMs: 1000,
        maxRequests: 5,
      });

      const context = createMockContext({ userId: 'test-user' });

      // Make 5 requests (should pass)
      for (let i = 0; i < 5; i++) {
        const result = await guardrail.execute('test', context);
        expect(result.passed).toBe(true);
      }

      // 6th request should be rate limited
      const result = await guardrail.execute('test', context);
      expect(result.passed).toBe(false);
    });
  });
});
```

### 2. Security Audit Checklist

- [ ] Input validation on all user inputs
- [ ] PII protection in logs and storage
- [ ] Rate limiting implemented
- [ ] Authentication and authorization where needed
- [ ] Secure error handling (no information leakage)
- [ ] Dependencies are up-to-date and secure
- [ ] Sensitive data is encrypted at rest
- [ ] Secure communication (TLS/HTTPS)
- [ ] Security headers configured
- [ ] Regular security audits performed

## Related Skills

- [Developing Guardrails](guardrail-dev.md) — Secure guardrail implementation patterns
- [Testing Strategies](testing.md) — Security test cases and audit checklist
- [Code Review Standards](code-review.md) — Security review checklist
- [Performance Guidelines](performance.md) — Secure performance patterns

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [npm Security Advisories](https://github.com/advisories?query=ecosystem%3Anpm)

---

_Last updated: 2026-04-22_
