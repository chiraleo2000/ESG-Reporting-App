import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    const storage = {
      state: { token: 'access-token', refreshToken: 'refresh-token', isAuthenticated: true },
    };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify(storage)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('retries one GET after a server error and does not retry a second 401', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(500, { message: 'down' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    const { projectsApi } = await import('../lib/api');
    const result = await projectsApi.getAll();
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes once on 401 and stops if the retry is still unauthorized', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { token: 'next-access', refreshToken: 'next-refresh' } }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'still expired' }));
    vi.stubGlobal('fetch', fetchMock);
    const { projectsApi } = await import('../lib/api');
    const result = await projectsApi.getAll();
    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/refresh');
  });

  it('reports a timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })));
    const { projectsApi } = await import('../lib/api');
    const pending = projectsApi.getAll();
    await vi.advanceTimersByTimeAsync(20000);
    await vi.advanceTimersByTimeAsync(20000);
    const result = await pending;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Request timed out');
  });

  it('reads non-json bodies, parent aborts, and a failed refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/plain' },
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: {} }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const { projectsApi } = await import('../lib/api');
    const plain = await projectsApi.getAll();
    expect(plain.success).toBe(true);

    const expired = await projectsApi.getAll();
    expect(expired.success).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'));
    const { activitiesApi } = await import('../lib/api');
    const failed = await activitiesApi.getByProject('p1');
    expect(failed.success).toBe(false);
    expect(failed.error).toBe('Network error occurred');
  });
});
