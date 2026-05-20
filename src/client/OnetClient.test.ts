import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OnetClient, OnetApiError } from './OnetClient'

const client = new OnetClient('test-api-key')

const mockSearchResponse = {
  start: 1, end: 2, total: 2,
  occupation: [
    { href: '/online/occupations/15-1252.00/', code: '15-1252.00', title: 'Software Developers', tags: { bright_outlook: true } },
    { href: '/online/occupations/15-1253.00/', code: '15-1253.00', title: 'Software Quality Assurance Analysts', tags: {} },
  ],
}

const mockOverview = {
  code: '15-1252.00',
  title: 'Software Developers',
  tags: { bright_outlook: true },
  description: 'Research, design, and develop computer and network software.',
  summary_contents: [],
  details_contents: [],
  custom_contents: [],
}

const mockElementSummary = {
  start: 1, end: 3, total: 3,
  element: [
    { id: '2.A.1.a', related: '/online/onet_data/skills_basic/2.A.1.a', name: 'Reading Comprehension', description: '...' },
  ],
}

function mockOk(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as Response
}

function mockError(status: number, text = 'Error') {
  return { ok: false, status, text: () => Promise.resolve(text) } as Response
}

describe('OnetClient', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  describe('searchOccupations', () => {
    it('calls the correct endpoint with query params', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockSearchResponse))
      await client.searchOccupations({ keyword: 'software', start: 1, end: 20 })
      const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(url.pathname).toBe('/ws/online/search')
      expect(url.searchParams.get('keyword')).toBe('software')
      expect(url.searchParams.get('start')).toBe('1')
      expect(url.searchParams.get('end')).toBe('20')
    })

    it('sets the X-API-Key header', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockSearchResponse))
      await client.searchOccupations({ keyword: 'software' })
      const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>
      expect(headers['X-API-Key']).toBe('test-api-key')
    })

    it('omits undefined optional params', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockSearchResponse))
      await client.searchOccupations({ keyword: 'software' })
      const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(url.searchParams.has('start')).toBe(false)
      expect(url.searchParams.has('end')).toBe(false)
    })

    it('returns typed search results', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockSearchResponse))
      const result = await client.searchOccupations({ keyword: 'software' })
      expect(result.total).toBe(2)
      expect(result.occupation[0].code).toBe('15-1252.00')
      expect(result.occupation[0].tags.bright_outlook).toBe(true)
    })

    it('throws OnetApiError on a 401 response', async () => {
      vi.mocked(fetch).mockResolvedValue(mockError(401, 'Unauthorized'))
      await expect(client.searchOccupations({ keyword: 'software' })).rejects.toThrow(OnetApiError)
    })

    it('includes the status code on OnetApiError', async () => {
      vi.mocked(fetch).mockResolvedValue(mockError(422, 'Invalid keyword'))
      const error = await client.searchOccupations({ keyword: '' }).catch((e) => e)
      expect(error).toBeInstanceOf(OnetApiError)
      expect((error as OnetApiError).status).toBe(422)
    })
  })

  describe('getOccupation', () => {
    it('calls the correct path', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockOverview))
      await client.getOccupation('15-1252.00')
      const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(url.pathname).toBe('/ws/online/occupations/15-1252.00/')
    })

    it('returns typed occupation overview', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockOverview))
      const result = await client.getOccupation('15-1252.00')
      expect(result.code).toBe('15-1252.00')
      expect(result.description).toBeTruthy()
    })

    it('throws OnetApiError on 404', async () => {
      vi.mocked(fetch).mockResolvedValue(mockError(404, 'Not found'))
      await expect(client.getOccupation('00-0000.00')).rejects.toThrow(OnetApiError)
    })
  })

  describe('summary section methods', () => {
    it('getOccupationSkills calls the correct path', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationSkills('15-1252.00')
      const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(url.pathname).toBe('/ws/online/occupations/15-1252.00/summary/skills')
    })

    it('getOccupationSkills passes pagination params', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationSkills('15-1252.00', { start: 5, end: 10 })
      const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(url.searchParams.get('start')).toBe('5')
      expect(url.searchParams.get('end')).toBe('10')
    })

    it('getOccupationJobZone calls the correct path', async () => {
      vi.mocked(fetch).mockResolvedValue(mockOk({ code: 4, title: 'Considerable Preparation Needed', education: '...', related_experience: '...', job_training: '...', job_zone_examples: '...', svp_range: '...' }))
      await client.getOccupationJobZone('15-1252.00')
      const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(url.pathname).toBe('/ws/online/occupations/15-1252.00/summary/job_zone')
    })
  })
})
