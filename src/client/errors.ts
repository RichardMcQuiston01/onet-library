/** Base class for every error this library throws, so callers can catch them all at once. */
export class OnetError extends Error {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'OnetError';
  }
}

/** Thrown when the O*NET API answers with a non-2xx HTTP status. */
export class OnetApiError extends OnetError {
  /**
   * @param status HTTP status code returned by the API (e.g. `401`, `404`).
   * @param message Short description naming the endpoint and status. It never
   *     includes the response body, so it is safer to show to end users.
   * @param endpoint Request path that failed, relative to the base URL (e.g. `/online/search`).
   * @param responseBody Truncated upstream response body, for server-side logs
   *     only: it can contain proxy error pages, stack traces or internal host names.
   */
  constructor(
    readonly status: number,
    message: string,
    readonly endpoint: string = '',
    readonly responseBody: string = ''
  ) {
    super(message);
    this.name = 'OnetApiError';
  }
}

/**
 * Thrown when a request never produced a usable response: the network call
 * failed (DNS, offline, CORS) or the body was not valid JSON. The original
 * error is available as `cause`.
 */
export class OnetRequestError extends OnetError {
  constructor(
    message: string,
    readonly endpoint: string,
    options?: {cause?: unknown}
  ) {
    super(message, options);
    this.name = 'OnetRequestError';
  }
}

/** Thrown before any request is sent when an argument is malformed, such as an invalid O*NET-SOC code. */
export class OnetValidationError extends OnetError {
  constructor(message: string) {
    super(message);
    this.name = 'OnetValidationError';
  }
}
