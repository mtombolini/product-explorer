import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getJson, NETWORK_ERROR_STATUS } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | Error): ReturnType<typeof vi.fn> {
  const fetchStub = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

describe('getJson', () => {
  it('returns the parsed body and leaves empty parameters out', async () => {
    const fetchStub = stubFetch(new Response('{"items": []}'));

    const body = await getJson('/api/products', {
      page: 2,
      search: '',
      category: "men's clothing",
    });

    expect(body).toEqual({ items: [] });
    expect(fetchStub.mock.calls[0][0]).toBe(
      '/api/products?page=2&category=men%27s+clothing',
    );
  });

  it('turns the error envelope into an ApiError', async () => {
    const envelope = {
      error: {
        code: 'validation_error',
        message: 'The request is not valid.',
        details: [{ field: 'page', message: 'Too small' }],
      },
    };
    stubFetch(new Response(JSON.stringify(envelope), { status: 422 }));

    const error = await getJson('/api/products').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      message: 'The request is not valid.',
      details: [{ field: 'page', message: 'Too small' }],
    });
  });

  it('copes with an error that is not our envelope', async () => {
    stubFetch(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await getJson('/api/products').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, code: 'unexpected_response' });
  });

  it('turns a network failure into an ApiError', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    const error = await getJson('/api/products').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: NETWORK_ERROR_STATUS,
      code: 'network_error',
    });
  });
});
