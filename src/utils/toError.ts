/** Normalises an unknown thrown value into an `Error` so hooks can expose a consistent `error` type. */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** True when `value` is the rejection produced by an aborted `AbortSignal`. */
export function isAbortError(value: unknown): boolean {
  // DOMException is not an Error subclass in every runtime, so match on name.
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as {name?: unknown}).name === 'AbortError'
  );
}
