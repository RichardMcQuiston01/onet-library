import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOccupationSearch } from './useOccupationSearch'
import type { OnetClient } from '../client/OnetClient'

const mockData = {
  start: 1,
  end: 1,
  total: 1,
  occupation: [
    { href: '/online/occupations/15-1252.00/', code: '15-1252.00', title: 'Software Developers', tags: { bright_outlook: true } },
  ],
}

function makeMockClient(overrides?: Partial<OnetClient>): OnetClient {
  return {
    searchOccupations: vi.fn().mockResolvedValue(mockData),
    ...overrides,
  } as unknown as OnetClient
}

describe('useOccupationSearch', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useOccupationSearch(makeMockClient()))
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading while the request is in flight', async () => {
    let resolve!: (value: typeof mockData) => void
    const client = makeMockClient({
      searchOccupations: vi.fn().mockReturnValue(new Promise((r) => { resolve = r })),
    })

    const { result } = renderHook(() => useOccupationSearch(client))

    act(() => { result.current.search({ keyword: 'software' }) })
    expect(result.current.loading).toBe(true)

    await act(async () => { resolve(mockData) })
    expect(result.current.loading).toBe(false)
  })

  it('populates data on success', async () => {
    const { result } = renderHook(() => useOccupationSearch(makeMockClient()))

    await act(async () => {
      await result.current.search({ keyword: 'software' })
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('sets error and clears data on failure', async () => {
    const client = makeMockClient({
      searchOccupations: vi.fn().mockRejectedValue(new Error('Network error')),
    })

    const { result } = renderHook(() => useOccupationSearch(client))

    await act(async () => {
      await result.current.search({ keyword: 'software' })
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Network error')
    expect(result.current.data).toBeNull()
  })

  it('clears a previous error on a successful retry', async () => {
    const searchOccupations = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockData)

    const { result } = renderHook(() => useOccupationSearch(makeMockClient({ searchOccupations })))

    await act(async () => { await result.current.search({ keyword: 'software' }) })
    expect(result.current.error).not.toBeNull()

    await act(async () => { await result.current.search({ keyword: 'software' }) })
    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(mockData)
  })
})
