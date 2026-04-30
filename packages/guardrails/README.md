# @reaatech/guardrail-chain-guardrails

[![npm version](https://img.shields.io/npm/v/@reaatech/guardrail-chain-guardrails.svg)](https://www.npmjs.com/package/@reaatech/guardrail-chain-guardrails)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/guardrail-chain/ci.yml?branch=main&label=CI)](https://github.com/reaatech/guardrail-chain/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Thirteen built-in guardrail implementations for the Guardrail Chain framework, covering input validation, output filtering, and result caching. Every guardrail implements the `Guardrail<TInput, TOutput>` interface from `@reaatech/guardrail-chain` and can be composed into a chain with budget-aware scheduling.

## Installation

```bash
npm install @reaatech/guardrail-chain-guardrails
# or
pnpm add @reaatech/guardrail-chain-guardrails
```

## Feature Overview

- **8 input guardrails** — PII redaction, prompt injection detection, topic boundary enforcement, cost estimation, rate limiting, language detection, content moderation, and memory limits.
- **4 output guardrails** — PII scanning, hallucination detection, toxicity filtering, and sentiment analysis.
- **Cached guardrail wrapper** — Wraps any guardrail with an LRU cache (TTL-based, keyed by input hash) to avoid redundant processing across multiple chain runs.
- **Regex-based implementations** — no external API calls, no network dependencies, deterministic behavior.
- **Configurable thresholds** — every guardrail accepts per-instance configuration for fine-tuned control.
- **Dual ESM/CJS output** — works with `import` and `require`.

## Quick Start

```typescript
import { GuardrailChain, setLogger, ConsoleLogger } from '@reaatech/guardrail-chain';
import {
  PIIRedaction,
  PromptInjection,
  ToxicityFilter,
} from '@reaatech/guardrail-chain-guardrails';

setLogger(new ConsoleLogger());

const chain = new GuardrailChain({
  budget: { maxLatencyMs: 500, maxTokens: 4000 },
});

chain
  .addGuardrail(new PIIRedaction())
  .addGuardrail(new PromptInjection())
  .addGuardrail(new ToxicityFilter());

const result = await chain.execute('My email is john@example.com');
console.log(result.output); // email redacted
```

## API Reference

### Input Guardrails

Input guardrails run before the LLM call, validating or transforming user input.

| Guardrail | ID | Description |
|-----------|----|-------------|
| `PIIRedaction` | `pii-redaction` | Detects and redacts PII — emails, phone numbers, SSNs, and credit card numbers. Uses regex patterns with a Luhn algorithm check for credit cards. Supports `mask` and `remove` redaction strategies. |
| `PromptInjection` | `prompt-injection` | Detects jailbreak and instruction-injection patterns including "ignore previous instructions", "DAN" mode, and role-reversal attempts. Returns a confidence score. |
| `TopicBoundary` | `topic-boundary` | Enforces topic constraints with configurable allowlist and blocklist of keywords. Blocks input containing blocked topics; optionally requires at least one allowed topic match. |
| `CostPrecheck` | `cost-precheck` | Estimates token count using a heuristic (~4 characters per token) and validates against a configurable budget before the LLM call. Supports character and token limits. |
| `RateLimiter` | `rate-limiter` | Sliding-window rate limiter keyed by `userId` or `sessionId`. Configurable window size, max requests per window, and cleanup interval. |
| `LanguageDetector` | `language-detector` | Simple keyword-fingerprint language detection supporting English, Spanish, French, German, Chinese, and Japanese. Configurable confidence threshold. |
| `ContentModeration` | `content-moderation` | Custom rule-based regex content moderation. Define your own patterns and categories. Ships with sensible defaults for common moderation scenarios. |
| `MemoryLimit` | `memory-limit` | Checks process heap memory against a configurable limit (default: 512 MB). Fails when heap usage exceeds the threshold, preventing OOM during chain execution. |

### Output Guardrails

Output guardrails run after the LLM call (or after input guardrails if no LLM is involved), validating or transforming the output.

| Guardrail | ID | Description |
|-----------|----|-------------|
| `PIIScan` | `pii-scan` | Scans LLM outputs for PII using the same detection logic as `PIIRedaction`. Returns detection results and optionally redacts found PII. |
| `HallucinationCheck` | `hallucination-check` | Heuristic check for speculative language patterns — "I think", "probably", "might be", "not sure", etc. Supports an optional external verifier for API-based fact-checking. |
| `ToxicityFilter` | `toxicity-filter` | Regex-based toxicity detection covering insults, violence, hate speech, and profanity. Configurable threshold per category. |
| `SentimentAnalysis` | `sentiment-analysis` | Simple positive/negative word-count sentiment scoring. Configurable threshold with optional pass/fail on negative sentiment. |

### Wrappers

| Class | Description |
|-------|-------------|
| `CachedGuardrail` | Wraps any guardrail with an LRU cache. Caches results by hashed input + config fingerprint, with configurable TTL and max size. Eliminates redundant guardrail evaluations when the same input passes through the chain multiple times. |

#### `CachedGuardrail` Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttlMs` | `number` | `3600000` | Cache TTL in milliseconds (default: 1 hour). |
| `maxSize` | `number` | `1000` | Maximum number of cached entries. |
| `configFingerprint` | `string` | `'default'` | Stable fingerprint to differentiate multiple `CachedGuardrail` instances wrapping the same underlying guardrail with different configuration. |

## Usage Patterns

### Combining multiple input guardrails

```typescript
import { GuardrailChain } from '@reaatech/guardrail-chain';
import {
  PIIRedaction,
  PromptInjection,
  TopicBoundary,
  CostPrecheck,
  RateLimiter,
} from '@reaatech/guardrail-chain-guardrails';

const chain = new GuardrailChain({
  budget: { maxLatencyMs: 500, maxTokens: 4000 },
});

chain
  .addGuardrail(new RateLimiter({ maxRequests: 100, windowMs: 60_000 }))
  .addGuardrail(new CostPrecheck({ maxTokens: 4000 }))
  .addGuardrail(new PIIRedaction({ redactionStrategy: 'mask' }))
  .addGuardrail(new PromptInjection())
  .addGuardrail(
    new TopicBoundary({
      allowedTopics: ['weather', 'travel', 'food'],
      blockedTopics: ['politics', 'religion'],
    }),
  );

const result = await chain.execute('Tell me about the weather in Paris');
```

### Caching expensive guardrails

```typescript
import { CachedGuardrail, PromptInjection } from '@reaatech/guardrail-chain-guardrails';

const cachedInjection = new CachedGuardrail(new PromptInjection(), {
  ttlMs: 300_000,
  maxSize: 500,
});
```

### Guardrail with custom configuration

```typescript
import { PIIRedaction } from '@reaatech/guardrail-chain-guardrails';

const redactor = new PIIRedaction({
  redactionStrategy: 'remove',
  customPatterns: [
    { pattern: /\b(?:api[_-]?key|secret|token)\s*[:=]\s*\S+/gi, replacement: '[CREDENTIAL]' },
  ],
});
```

## Related Packages

- [`@reaatech/guardrail-chain`](https://www.npmjs.com/package/@reaatech/guardrail-chain) — core framework with chain orchestration, budget management, and the `Guardrail` interface
- [`@reaatech/guardrail-chain-observability`](https://www.npmjs.com/package/@reaatech/guardrail-chain-observability) — pluggable logging, metrics, and tracing interfaces
- [`@reaatech/guardrail-chain-config`](https://www.npmjs.com/package/@reaatech/guardrail-chain-config) — configuration loader and Zod-based validator

## License

[MIT](https://github.com/reaatech/guardrail-chain/blob/main/LICENSE)
