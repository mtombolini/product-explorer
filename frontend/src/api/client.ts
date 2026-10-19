import type { ApiErrorDetail, ApiErrorEnvelope } from './types';

/** Status and code used when no response arrived at all (offline, server down). */
export const NETWORK_ERROR_STATUS = 0;
export const NETWORK_ERROR_CODE = 'network_error';

/**
 * The only error the API layer throws. It carries what the backend put in
 * its error envelope, so callers never deal with raw responses.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | null | undefined;

/** Build "path?key=value", leaving out empty, null and undefined values. */
function buildUrl(path: string, params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/** Turn a non-2xx response into an ApiError. */
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: ApiErrorEnvelope = await response.json();
    const { code, message, details } = body.error;
    return new ApiError(response.status, code, message, details);
  } catch {
    // Not our envelope: for example the 502 page Nginx answers while the
    // backend restarts.
    return new ApiError(
      response.status,
      'unexpected_response',
      'The server returned an unexpected response.',
    );
  }
}

/**
 * GET a JSON resource from our own API.
 *
 * This is the only place in the application that calls fetch. Every
 * failure, including a network failure, is thrown as an ApiError.
 */
export async function getJson<T>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError(
      NETWORK_ERROR_STATUS,
      NETWORK_ERROR_CODE,
      'The server could not be reached.',
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  const data: T = await response.json();
  return data;
}
