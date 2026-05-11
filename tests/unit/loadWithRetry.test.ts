import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, loadJsonWithRetry } from '../../src/utils/loadWithRetry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns response on first success', async () => {
    const okResponse = { ok: true, status: 200, json: async () => ({ value: 1 }) } as Response;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(okResponse);
    const promise = fetchWithRetry('/data.json', undefined, { baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(okResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const okResponse = { ok: true, status: 200, json: async () => ({ value: 1 }) } as Response;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('net'))
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(okResponse);
    const promise = fetchWithRetry('/data.json', undefined, { retries: 3, baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(okResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('rejects after exhausting retries', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('net'));
    const promise = fetchWithRetry('/x', undefined, { retries: 2, baseDelayMs: 1 });
    const expectation = expect(promise).rejects.toThrow('net');
    await vi.runAllTimersAsync();
    await expectation;
  });

  it('treats non-2xx as error and retries', async () => {
    const bad = { ok: false, status: 500 } as Response;
    const ok = { ok: true, status: 200 } as Response;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(ok);
    const promise = fetchWithRetry('/x', undefined, { retries: 2, baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(ok);
  });
});

describe('loadJsonWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('parses JSON response', async () => {
    const okResponse = { ok: true, status: 200, json: async () => ({ value: 42 }) } as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(okResponse);
    const promise = loadJsonWithRetry<{ value: number }>('/x', { baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.value).toBe(42);
  });
});
