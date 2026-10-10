import {OnetApiError, OnetRequestError, OnetValidationError} from './errors';
import {isAbortError} from '../utils/toError';

/** Default O*NET Web Services endpoint. */
export const DEFAULT_BASE_URL = 'https://services.onetcenter.org/ws';

/** Longest slice of an error response body copied into an error message. */
const MAX_ERROR_BODY_LENGTH = 500;

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
  value: unknown;
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
  /** Successful responses, keyed by URL; the TTL starts when the response arrives. */
  private readonly cache = new Map<string, CacheEntry>();
  /** Requests still running, keyed by URL, so identical calls share one fetch regardless of TTL. */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * @param apiKey O*NET API key sent as the `X-API-Key` header. Leave it
   *     undefined when `baseUrl` points at a proxy that adds the key itself.
   * @param options Transport settings; see {@link OnetClientOptions}.
   */
  constructor(
    private readonly apiKey: string | undefined,
    private readonly options: OnetClientOptions = {}
  ) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const requestedTtlMs = options.cacheTtlMs ?? 0;
    // NaN and Infinity would produce an expiry that never matches; treat them as "off".
    this.cacheTtlMs = Number.isFinite(requestedTtlMs)
      ? Math.max(0, requestedTtlMs)
      : 0;
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

  /** Drops every cached response and stops sharing requests that are still running. */
  clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
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

  /**
   * Returns a private copy of the cached value for `url`, fetching it if
   * needed. Concurrent calls join one request; the TTL starts when it succeeds.
   * Every caller gets its own clone, so mutating a result cannot change what
   * later callers receive.
   */
  private async getCached<T>(url: string, path: string): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return structuredClone(cached.value) as T;
    }
    this.cache.delete(url);

    let request = this.inFlight.get(url) as Promise<T> | undefined;
    if (!request) {
      const started: Promise<T> = this.send<T>(url, path).then(value => {
        // Skip the write if clearCache() ran while the request was in flight.
        if (this.inFlight.get(url) === started) {
          this.cache.set(url, {
            expiresAt: Date.now() + this.cacheTtlMs,
            value,
          });
          this.evictOverflow();
        }
        return value;
      });
      request = started;
      this.inFlight.set(url, started);
      // Failures are not cached, so the next call retries.
      const forget = (): void => {
        if (this.inFlight.get(url) === started) this.inFlight.delete(url);
      };
      started.then(forget, forget);
    }
    return structuredClone(await request);
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
      response = await fetchImpl(url, {headers, signal});
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
        `O*NET request GET ${path} failed with HTTP ${statusLabel}` +
          (body ? `: ${body}` : ''),
        path
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
  try {
    return new URL(href, pageUrl);
  } catch {
    throw new OnetValidationError(
      `Cannot build an O*NET request URL from "${href}": a relative baseUrl ` +
        'only works in a browser. Use an absolute URL such as https://example.com/api/onet.'
    );
  }
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
