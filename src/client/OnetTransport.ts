import {OnetApiError, OnetRequestError, OnetValidationError} from './errors';
import {isAbortError} from '../utils/toError';

/** Default O*NET Web Services endpoint. */
export const DEFAULT_BASE_URL = 'https://services.onetcenter.org/ws';

/** Longest slice of an error response body copied into an error message. */
const MAX_ERROR_BODY_LENGTH = 500;

/** Characters that must never appear in an HTTP header value. */
const INVALID_HEADER_VALUE_PATTERN = /[\r\n\0]/;

/** Minimal `fetch` signature the transport relies on, so any wrapper or polyfill fits. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Settings shared by `OnetClient` and its transport. Every field is optional. */
export interface OnetClientOptions {
  /**
   * Root URL that request paths are appended to. Point this at your own
   * server-side proxy to keep the API key out of the browser.
   * @defaultValue `https://services.onetcenter.org/ws`
   */
  baseUrl?: string;
  /**
   * `fetch` implementation to use. Defaults to the global `fetch`, looked up
   * on every request so test stubs and polyfills installed later still apply.
   */
  fetch?: FetchLike;
  /**
   * How long, in milliseconds, to reuse a successful response for an
   * identical request. `0` (the default) disables caching.
   */
  cacheTtlMs?: number;
  /**
   * Upper bound on cached responses; the oldest entry is evicted first.
   * Only used when `cacheTtlMs` is greater than `0`.
   * @defaultValue `100`
   */
  cacheMaxEntries?: number;
}

/** Per-call options accepted by every `OnetClient` method. */
export interface RequestOptions {
  /** Aborts the request. Hooks pass this automatically when their inputs change or they unmount. */
  signal?: AbortSignal;
}

/** Query-string values; `undefined` entries are left out of the URL. */
export type QueryParams = Readonly<Record<string, string | number | undefined>>;

interface CacheEntry {
  expiresAt: number;
  promise: Promise<unknown>;
}

/**
 * Low-level HTTP layer: builds URLs, sends authenticated GET requests, turns
 * failures into typed errors, and optionally caches responses. `OnetClient`
 * describes *which* endpoints exist; this class handles *how* they are called.
 */
export class OnetTransport {
  private readonly baseUrl: string;
  private readonly cacheTtlMs: number;
  private readonly cacheMaxEntries: number;
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * @param apiKey O*NET API key sent as the `X-API-Key` header. Leave it
   *     undefined when `baseUrl` points at a proxy that adds the key itself.
   * @param options Transport settings; see {@link OnetClientOptions}.
   */
  constructor(
    private readonly apiKey: string | undefined,
    private readonly options: OnetClientOptions = {}
  ) {
    if (apiKey !== undefined && INVALID_HEADER_VALUE_PATTERN.test(apiKey)) {
      throw new OnetValidationError(
        'Invalid O*NET API key: it contains a carriage return, line feed or NUL ' +
          'character, which cannot be sent in an HTTP header.'
      );
    }
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.cacheTtlMs = Math.max(0, options.cacheTtlMs ?? 0);
    this.cacheMaxEntries = Math.max(1, options.cacheMaxEntries ?? 100);
  }

  /**
   * Sends a GET request and parses the JSON body.
   *
   * @param path Endpoint path starting with `/`, e.g. `/online/search`.
   * @param query Query-string parameters; `undefined` values are skipped.
   * @param requestOptions Per-call options such as an abort signal.
   * @throws {OnetApiError} The API returned a non-2xx status.
   * @throws {OnetRequestError} The network call failed or the body was not JSON.
   */
  async get<T>(
    path: string,
    query?: QueryParams,
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    if (this.cacheTtlMs === 0) {
      return this.send<T>(url, path, requestOptions.signal);
    }
    // Cached requests are shared between callers, so the underlying fetch
    // cannot honour any single caller's signal; each caller is detached instead.
    return withAbort(this.getCached<T>(url, path), requestOptions.signal);
  }

  /** Drops every cached response. */
  clearCache(): void {
    this.cache.clear();
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const url = resolveUrl(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private getCached<T>(url: string, path: string): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > now) {
      return cached.promise as Promise<T>;
    }

    const promise = this.send<T>(url, path);
    this.cache.delete(url);
    this.cache.set(url, {expiresAt: now + this.cacheTtlMs, promise});
    // Failures should be retried on the next call, not replayed from cache.
    promise.catch(() => {
      if (this.cache.get(url)?.promise === promise) {
        this.cache.delete(url);
      }
    });
    this.evictOverflow();
    return promise;
  }

  private evictOverflow(): void {
    while (this.cache.size > this.cacheMaxEntries) {
      // Map iterates in insertion order, so the first key is the oldest.
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) return;
      this.cache.delete(oldestKey);
    }
  }

  private async send<T>(
    url: string,
    path: string,
    signal?: AbortSignal
  ): Promise<T> {
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    // Resolved per call so a stub assigned to globalThis.fetch after construction is honoured.
    const fetchImpl: FetchLike = this.options.fetch ?? globalThis.fetch;

    let response: Response;
    try {
      // A redirect could carry the API key to a different path or host.
      response = await fetchImpl(url, {headers, signal, redirect: 'error'});
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      throw new OnetRequestError(
        `O*NET request GET ${path} could not be sent: ${describe(error)}`,
        path,
        {cause: error}
      );
    }

    if (!response.ok) {
      const statusLabel = [response.status, response.statusText]
        .filter(Boolean)
        .join(' ');
      const body = await readBodySafely(response);
      throw new OnetApiError(
        response.status,
        `O*NET request GET ${path} failed with HTTP ${statusLabel}`,
        path,
        body
      );
    }

    try {
      return (await response.json()) as T;
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      throw new OnetRequestError(
        `O*NET request GET ${path} returned a body that is not valid JSON: ${describe(error)}`,
        path,
        {cause: error}
      );
    }
  }
}

/**
 * Parses an absolute URL, or resolves a relative one (e.g. a `/api/onet`
 * proxy) against the current page. Outside a browser there is no page to
 * resolve against, so a relative `baseUrl` is reported clearly.
 */
function resolveUrl(href: string): URL {
  const pageUrl = globalThis.location?.href;
  let url: URL;
  try {
    url = new URL(href, pageUrl);
  } catch {
    throw new OnetValidationError(
      `Cannot build an O*NET request URL from "${href}": a relative baseUrl ` +
        'only works in a browser. Use an absolute URL such as https://example.com/api/onet.'
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OnetValidationError(
      `Invalid baseUrl: protocol "${url.protocol}" is not allowed. Use an http: or https: URL.`
    );
  }
  if (url.username || url.password) {
    throw new OnetValidationError(
      'Invalid baseUrl: it must not contain a username or password. ' +
        'Pass the API key through the OnetClient constructor instead.'
    );
  }
  return url;
}

/** Reads an error response body for diagnostics, never throwing and capping its length. */
async function readBodySafely(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.length > MAX_ERROR_BODY_LENGTH
      ? `${text.slice(0, MAX_ERROR_BODY_LENGTH)}…`
      : text;
  } catch {
    return '';
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Lets one caller stop waiting on a shared promise without cancelling it for others. */
function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortReason(signal));
    signal.addEventListener('abort', onAbort, {once: true});
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

function abortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ?? new DOMException('The request was aborted.', 'AbortError')
  );
}
