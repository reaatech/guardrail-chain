import { describe, it, expect } from 'vitest';
import { LRUCache } from '../../../src/utils/cache.js';

describe('LRUCache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>();
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
  });

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string, number>();
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  it('should evict least recently used items', () => {
    const cache = new LRUCache<string, number>({ maxSize: 2, ttlMs: 10000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // should evict 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('should update recency on get', () => {
    const cache = new LRUCache<string, number>({ maxSize: 2, ttlMs: 10000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is now most recently used
    cache.set('c', 3); // should evict 'b'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('should expire entries after TTL', async () => {
    const cache = new LRUCache<string, number>({ maxSize: 10, ttlMs: 50 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);

    await new Promise((r) => setTimeout(r, 60));
    expect(cache.get('a')).toBeUndefined();
  });

  it('should delete entries', () => {
    const cache = new LRUCache<string, number>();
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
  });

  it('should clear all entries', () => {
    const cache = new LRUCache<string, number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should track size', () => {
    const cache = new LRUCache<string, number>();
    expect(cache.size()).toBe(0);
    cache.set('a', 1);
    expect(cache.size()).toBe(1);
  });
});
