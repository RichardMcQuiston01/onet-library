import { useState, useEffect } from 'react'
import type { OnetQueryResult } from '../types'

// Internal hook used by declarative data hooks (useOccupation, etc.).
// Fires whenever `fetcher` identity changes; pass null to stay idle.
// Uses a cancelled flag to discard results from superseded requests.
export function useOnetQuery<T>(fetcher: (() => Promise<T>) | null): OnetQueryResult<T> {
  const [state, setState] = useState<OnetQueryResult<T>>({ data: null, loading: false, error: null })

  useEffect(() => {
    if (!fetcher) {
      setState({ data: null, loading: false, error: null })
      return
    }
    let cancelled = false
    setState({ data: null, loading: true, error: null })
    fetcher()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err : new Error(String(err)) })
        }
      })
    return () => { cancelled = true }
  }, [fetcher])

  return state
}
