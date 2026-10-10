import {useEffect, useState} from 'react';
import type {OnetQueryResult} from '../types';
import {toError} from '../utils/toError';

/** A request that can be cancelled through the supplied signal. */
export type OnetFetcher<T> = (signal: AbortSignal) => Promise<T>;

const IDLE_STATE: OnetQueryResult<never> = {
  data: null,
  loading: false,
  error: null,
};

/**
 * Internal engine behind the declarative data hooks (`useOccupation`, etc.).
 *
 * Runs `fetcher` whenever its identity changes, so callers must memoise it;
 * passing `null` resets to idle without requesting anything. When the fetcher
 * changes or the component unmounts, the in-flight request is aborted and its
 * result discarded. During a refetch the previous `data` stays visible, and a
 * failed refetch keeps it too (with `error` set), so check `loading` and
 * `error` before treating `data` as belonging to the current inputs.
 */
export function useOnetQuery<T>(
  fetcher: OnetFetcher<T> | null
): OnetQueryResult<T> {
  // Start in the loading state when there is work to do, so the first render
  // does not briefly report "idle with no data".
  const [state, setState] = useState<OnetQueryResult<T>>(() =>
    fetcher === null ? IDLE_STATE : {...IDLE_STATE, loading: true}
  );
  // Functions passed to useState/setState are treated as initializers/updaters, so wrap them.
  const [trackedFetcher, setTrackedFetcher] = useState(() => fetcher);

  // Adjust state while rendering, not in the effect: React re-renders at once
  // and discards this pass, so `loading` is already true on the first render
  // that sees new inputs and the previous occupation is never shown as current.
  if (trackedFetcher !== fetcher) {
    setTrackedFetcher(() => fetcher);
    setState(previous =>
      fetcher === null
        ? IDLE_STATE
        : {data: previous.data, loading: true, error: null}
    );
  }

  useEffect(() => {
    if (fetcher === null) return;
    const controller = new AbortController();
    fetcher(controller.signal).then(
      data => {
        if (!controller.signal.aborted) {
          setState({data, loading: false, error: null});
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          // Keep the last good data so a failed refetch does not blank the UI.
          setState(previous => ({
            data: previous.data,
            loading: false,
            error: toError(error),
          }));
        }
      }
    );
    return () => controller.abort();
  }, [fetcher]);

  return state;
}
