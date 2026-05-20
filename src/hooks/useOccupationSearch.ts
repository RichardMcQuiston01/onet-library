import { useState, useCallback } from 'react'
import type { OnetClient } from '../client/OnetClient'
import type { OccupationSearchParams, OccupationSearchResult } from '../types'

interface UseOccupationSearchReturn {
  data: OccupationSearchResult | null
  loading: boolean
  error: Error | null
  search: (params: OccupationSearchParams) => Promise<void>
}

export function useOccupationSearch(client: OnetClient): UseOccupationSearchReturn {
  const [data, setData] = useState<OccupationSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const search = useCallback(
    async (params: OccupationSearchParams) => {
      setLoading(true)
      setError(null)
      try {
        setData(await client.searchOccupations(params))
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    },
    [client],
  )

  return { data, loading, error, search }
}
