import { describe, it, expect, mock } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useOccupation,
  useOccupationSkills,
  useOccupationAbilities,
  useOccupationKnowledge,
  useOccupationTasks,
  useOccupationJobZone,
} from './useOccupation'
import type { OnetClient } from '../client/OnetClient'

const mockOverview = {
  code: '15-1252.00',
  title: 'Software Developers',
  tags: { bright_outlook: true },
  description: 'Research, design, and develop computer and network software.',
  summary_contents: [],
  details_contents: [],
  custom_contents: [],
}

const mockElements = {
  start: 1, end: 1, total: 1,
  element: [{ id: '2.A.1.a', related: '', name: 'Reading Comprehension', description: '...' }],
}

const mockTasks = {
  start: 1, end: 1, total: 1,
  task: [{ id: '13999', related: '', title: 'Develop system specifications.' }],
}

const mockJobZone = {
  code: 4,
  title: 'Considerable Preparation Needed',
  education: "Most of these occupations require a four-year bachelor's degree.",
  related_experience: 'A considerable amount of work-related skill is required.',
  job_training: 'Employees may need some on-the-job training.',
  job_zone_examples: 'Accountants, Engineers, Pharmacists.',
  svp_range: '(7.0 to < 8.0)',
}

function makeMockClient(overrides?: Partial<OnetClient>): OnetClient {
  return {
    getOccupation: mock(() => Promise.resolve(mockOverview)),
    getOccupationSkills: mock(() => Promise.resolve(mockElements)),
    getOccupationAbilities: mock(() => Promise.resolve(mockElements)),
    getOccupationKnowledge: mock(() => Promise.resolve(mockElements)),
    getOccupationTasks: mock(() => Promise.resolve(mockTasks)),
    getOccupationJobZone: mock(() => Promise.resolve(mockJobZone)),
    ...overrides,
  } as unknown as OnetClient
}

describe('useOccupation', () => {
  it('starts idle when code is null', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupation(client, null))
    expect(result.current).toEqual({ data: null, loading: false, error: null })
  })

  it('sets loading true on initial fetch', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupation(client, '15-1252.00'))
    expect(result.current.loading).toBe(true)
  })

  it('populates data after fetch resolves', async () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupation(client, '15-1252.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(mockOverview)
    expect(result.current.error).toBeNull()
  })

  it('sets error on failure', async () => {
    const client = makeMockClient({
      getOccupation: mock(() => Promise.reject(new Error('Not found'))),
    })
    const { result } = renderHook(() => useOccupation(client, '00-0000.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('Not found')
    expect(result.current.data).toBeNull()
  })

  it('resets to idle when code becomes null', async () => {
    const client = makeMockClient()
    const { result, rerender } = renderHook(
      ({ code }: { code: string | null }) => useOccupation(client, code),
      { initialProps: { code: '15-1252.00' as string | null } },
    )
    await waitFor(() => expect(result.current.data).not.toBeNull())

    rerender({ code: null })
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('refetches when code changes', async () => {
    const getOccupation = mock(() => Promise.resolve(mockOverview))
    const client = makeMockClient({ getOccupation })
    const { rerender } = renderHook(
      ({ code }: { code: string }) => useOccupation(client, code),
      { initialProps: { code: '15-1252.00' } },
    )
    await waitFor(() => expect(getOccupation).toHaveBeenCalledTimes(1))
    rerender({ code: '15-1253.00' })
    await waitFor(() => expect(getOccupation).toHaveBeenCalledTimes(2))
    expect(getOccupation).toHaveBeenLastCalledWith('15-1253.00')
  })
})

describe('useOccupationSkills', () => {
  it('fetches skills for the given code', async () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationSkills(client, '15-1252.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.element[0].name).toBe('Reading Comprehension')
    expect(result.current.error).toBeNull()
  })

  it('stays idle when code is null', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationSkills(client, null))
    expect(result.current).toEqual({ data: null, loading: false, error: null })
  })
})

describe('useOccupationAbilities', () => {
  it('fetches abilities for the given code', async () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationAbilities(client, '15-1252.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.element[0].name).toBe('Reading Comprehension')
    expect(result.current.error).toBeNull()
  })

  it('stays idle when code is null', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationAbilities(client, null))
    expect(result.current).toEqual({ data: null, loading: false, error: null })
  })
})

describe('useOccupationKnowledge', () => {
  it('fetches knowledge for the given code', async () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationKnowledge(client, '15-1252.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.total).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('stays idle when code is null', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationKnowledge(client, null))
    expect(result.current).toEqual({ data: null, loading: false, error: null })
  })
})

describe('useOccupationTasks', () => {
  it('fetches tasks for the given code', async () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationTasks(client, '15-1252.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.task[0].title).toBe('Develop system specifications.')
    expect(result.current.error).toBeNull()
  })

  it('stays idle when code is null', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationTasks(client, null))
    expect(result.current).toEqual({ data: null, loading: false, error: null })
  })
})

describe('useOccupationJobZone', () => {
  it('fetches job zone data', async () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationJobZone(client, '15-1252.00'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.code).toBe(4)
    expect(result.current.error).toBeNull()
  })

  it('stays idle when code is null', () => {
    const client = makeMockClient()
    const { result } = renderHook(() => useOccupationJobZone(client, null))
    expect(result.current).toEqual({ data: null, loading: false, error: null })
  })
})
