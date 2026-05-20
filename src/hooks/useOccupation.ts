import { useMemo } from 'react'
import { useOnetQuery } from './useOnetQuery'
import type { OnetClient } from '../client/OnetClient'
import type {
  OccupationOverview,
  OccupationElementSummary,
  JobZoneSummary,
  TasksSummary,
  PaginationParams,
} from '../types'

export function useOccupation(client: OnetClient, code: string | null) {
  const fetcher = useMemo(
    () => (code ? () => client.getOccupation(code) : null),
    [client, code],
  )
  return useOnetQuery<OccupationOverview>(fetcher)
}

export function useOccupationSkills(client: OnetClient, code: string | null, params?: PaginationParams) {
  const fetcher = useMemo(
    () => (code ? () => client.getOccupationSkills(code, params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, code, params?.start, params?.end],
  )
  return useOnetQuery<OccupationElementSummary>(fetcher)
}

export function useOccupationAbilities(client: OnetClient, code: string | null, params?: PaginationParams) {
  const fetcher = useMemo(
    () => (code ? () => client.getOccupationAbilities(code, params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, code, params?.start, params?.end],
  )
  return useOnetQuery<OccupationElementSummary>(fetcher)
}

export function useOccupationKnowledge(client: OnetClient, code: string | null, params?: PaginationParams) {
  const fetcher = useMemo(
    () => (code ? () => client.getOccupationKnowledge(code, params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, code, params?.start, params?.end],
  )
  return useOnetQuery<OccupationElementSummary>(fetcher)
}

export function useOccupationTasks(client: OnetClient, code: string | null, params?: PaginationParams) {
  const fetcher = useMemo(
    () => (code ? () => client.getOccupationTasks(code, params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, code, params?.start, params?.end],
  )
  return useOnetQuery<TasksSummary>(fetcher)
}

export function useOccupationJobZone(client: OnetClient, code: string | null) {
  const fetcher = useMemo(
    () => (code ? () => client.getOccupationJobZone(code) : null),
    [client, code],
  )
  return useOnetQuery<JobZoneSummary>(fetcher)
}
