import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RestDataProvider } from '../src/data-provider/rest';
import { LRUCache, TTLCache } from '../src/data-provider/cache';
import { JSONPathMapper } from '../src/data-provider/mapper';

describe('LRUCache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('should evict least recently used when capacity is exceeded', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // 'a' should be evicted

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should move accessed items to end', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // Access 'a' to move it to end
    cache.set('d', 4); // 'b' should be evicted (not 'a')

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });
});

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return cached value within TTL', () => {
    const cache = new TTLCache<string, number>(10, 1000);
    cache.set('key', 42);

    expect(cache.get('key')).toBe(42);
  });

  it('should return undefined after TTL expires', () => {
    const cache = new TTLCache<string, number>(10, 1000);
    cache.set('key', 42);

    vi.advanceTimersByTime(1001);

    expect(cache.get('key')).toBeUndefined();
  });
});

describe('JSONPathMapper', () => {
  it('should get value by JSONPath', () => {
    const obj = {
      labels: ['Jan', 'Feb'],
      data: {
        datasets: [{ label: 'Sales', data: [100, 200] }]
      }
    };

    expect(JSONPathMapper.getValue(obj, '$.labels')).toEqual(['Jan', 'Feb']);
    expect(JSONPathMapper.getValue(obj, '$.data.datasets')).toBeDefined();
  });

  it('should map data according to mapping rules', () => {
    const data = {
      labels: ['Jan', 'Feb'],
      charts: [
        { label: 'Sales', values: [100, 200] }
      ]
    };

    const mapping = {
      'labels': '$.labels',
      'datasets': '$.charts'
    };

    const result = JSONPathMapper.map(data, mapping);

    expect(result.labels).toEqual(['Jan', 'Feb']);
    expect(result.datasets).toEqual(data.charts);
  });
});

describe('RestDataProvider', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string) =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ labels: [], datasets: [] })
        })
      )
    );
  });

  it('should fetch data from REST API', async () => {
    const mockResponse: { labels: string[]; datasets: { label: string; data: number[] }[] } = {
      labels: ['Jan', 'Feb'],
      datasets: [{ label: 'Sales', data: [100, 200] }]
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse)
    });

    const provider = new RestDataProvider();
    const result = await provider.fetch({ url: '/api/charts/sales', method: 'GET' });

    expect(result.labels).toEqual(['Jan', 'Feb']);
    expect(result.datasets).toHaveLength(1);
  });

  it('should apply mapping to response', async () => {
    const mockResponse = {
      months: ['Jan', 'Feb'],
      charts: [{ label: 'Sales', values: [100, 200] }]
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse)
    });

    const provider = new RestDataProvider();
    const mapping = {
      'labels': '$.months',
      'datasets': '$.charts'
    };

    const result = await provider.fetch(
      { url: '/api/charts/sales', method: 'GET' },
      undefined,
      mapping
    );

    expect(result.labels).toEqual(['Jan', 'Feb']);
    expect(result.datasets).toEqual(mockResponse.charts);
  });

  it('should cache responses', async () => {
    const mockResponse: { labels: string[]; datasets: unknown[] } = {
      labels: ['Jan'],
      datasets: []
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse)
    });

    const provider = new RestDataProvider({ cacheEnabled: true });
    const source = { url: '/api/charts/sales', method: 'GET' as const };

    await provider.fetch(source);
    await provider.fetch(source);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should substitute params in URL', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ labels: [], datasets: [] })
    });

    const provider = new RestDataProvider();
    await provider.fetch(
      { url: '/api/charts/${reportId}', method: 'GET' },
      { reportId: 'sales-2024' }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sales-2024'),
      expect.any(Object)
    );
  });
});
