/**
 * Shape of error response body returned by the backend.
 * Used as a typeguard target when handling rejected promises from axios.
 */
export interface ApiErrorBody {
  statusCode: number;
  code?: string;
  message?: string;
  details?: unknown;
  path?: string;
  timestamp?: string;
}

/**
 * Typeguard that checks whether an unknown value is an API error body
 * (i.e. an object with a numeric `statusCode` field).
 */
export function isApiError(e: unknown): e is ApiErrorBody {
  return (
    typeof e === 'object' &&
    e !== null &&
    'statusCode' in e &&
    typeof (e as Record<string, unknown>).statusCode === 'number'
  );
}
