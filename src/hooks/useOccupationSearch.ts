import {useCallback, useEffect, useRef, useState} from 'react';
import type {OnetClient} from '../client/OnetClient';
import type {
  OccupationSearchParams,
  OccupationSearchResult,
  OnetQueryResult,
} from '../types';
import {toError} from '../utils/toError';

/** State plus the `search` trigger returned by {@link useOccupationSearch}. */
export interface UseOccupationSearchReturn extends OnetQueryResult<OccupationSearchResult> {
  /**
   * Starts a keyword search, aborting any search still in flight. Never
   * rejects: failures are reported through `error`.
   */
  search: (params: OccupationSearchParams) => Promise<void>;
}

const INITIAL_STATE: OnetQueryResult<OccupationSearchResult> = {
  data: null,
  loading: false,
  error: null,
};

/**
 * Imperative keyword search. Nothing is fetched until `search` is called.
 *
 * Only the most recent search can update state: starting a new search (or
 * unmounting) aborts the previous request, so a slow earlier response can
 * never overwrite newer results. Previous results stay visible while the next
 * search loads.
 *
 * @param client Shared `OnetClient` instance.
 */
export function useOccupationSearch(
  client: OnetClient
): UseOccupationSearchReturn {
  const [state, setState] = useState(INITIAL_STATE);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  const search = useCallback(
    async (params: OccupationSearchParams): Promise<void> => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;

      setState(previous => ({data: previous.data, loading: true, error: null}));
      try {
        const data = await client.searchOccupations(params, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setState({data, loading: false, error: null});
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({data: null, loading: false, error: toError(error)});
        }
      }
    },
    [client]
  );

  return {...state, search};
}
