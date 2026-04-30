import { describe, expect, it } from 'vitest';
import { generateCorrelationId, hashString } from './helpers.js';

describe('helpers', () => {
  describe('generateCorrelationId', () => {
    it('should generate a UUID-like string', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique ids', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('hashString', () => {
    it('should return a number', () => {
      expect(typeof hashString('hello')).toBe('number');
    });

    it('should return consistent hashes for same input', () => {
      expect(hashString('test')).toBe(hashString('test'));
    });

    it('should return different hashes for different inputs', () => {
      expect(hashString('a')).not.toBe(hashString('b'));
    });

    it('should not produce collisions for moderate input sets', () => {
      const seen = new Set<number>();
      const count = 10000;
      for (let i = 0; i < count; i++) {
        const input = `input-${i}-${Math.random().toString(36)}-${Date.now()}`;
        const hash = hashString(input);
        if (seen.has(hash)) {
          throw new Error(`Collision detected at iteration ${i} for hash ${hash}`);
        }
        seen.add(hash);
      }
      expect(seen.size).toBe(count);
    });
  });
});
