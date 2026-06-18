import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import { OnetClient, OnetApiError } from './OnetClient'

const client = new OnetClient('test-api-key')

// ── Mock fixtures ─────────────────────────────────────────────────────────────

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

const mockJobZone = {
  code: 4,
  title: 'Considerable Preparation Needed',
  education: "Most of these occupations require a four-year bachelor's degree.",
  related_experience: 'A considerable amount of work-related skill is required.',
  job_training: 'Employees may need some on-the-job training.',
  job_zone_examples: 'Accountants, Engineers, Pharmacists.',
  svp_range: '(7.0 to < 8.0)',
}

const mockWorkContext = {
  start: 1, end: 1, total: 1,
  element: [{
    id: '4.C.1.a.2.a', related: '', name: 'Face-to-Face Discussions', description: '...',
    response: [{ percentage_of_respondents: 55, description: 'Every day' }],
  }],
}

const mockTasks = {
  start: 1, end: 1, total: 1,
  task: [{ id: '13999', related: '', title: 'Develop system specifications.' }],
}

const mockTechnologySkills = {
  start: 1, end: 1, total: 1,
  category: [{
    code: 1, related: '', title: 'Development Environment Software',
    example: [{ title: 'Apache Maven', href: '...', hot_technology: true }],
  }],
}

const mockRelatedOccupations = {
  start: 1, end: 1, total: 1,
  occupation: [{ href: '', code: '15-1253.00', title: 'Software QA Analysts', tags: {} }],
}

const mockInterests = {
  interest_code: 'ICR',
  element: [{ id: '1.B.1.a', related: '', name: 'Investigative', description: '...' }],
}

const mockEducation = {
  response: [{ code: 6, title: "Bachelor's Degree", percentage_of_respondents: 46 }],
}

const mockDetailedWorkActivities = {
  start: 1, end: 1, total: 1,
  activity: [{ id: '4.A.1.a.1', title: 'Compile technical information.', related: '' }],
}

const mockApprenticeship = {
  start: 1, end: 0, total: 0,
  example_title: [],
}

const mockProfessionalAssociations = {
  start: 1, end: 1, total: 1,
  source: [{ url: 'https://www.ieee.org', name: 'IEEE', category: { code: 'national' as const, title: 'National' } }],
}

const mockMilitaryCareerSummaries = {
  start: 1, end: 1, total: 1,
  career_summary: [{ url: '...', title: 'Software Developer (Army)' }],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockOk(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) } as Response
}

function mockError(status: number, text = 'Error') {
  return { ok: false, status, text: () => Promise.resolve(text) } as Response
}

// ── Fetch stub ────────────────────────────────────────────────────────────────

const fetchMock = mock<typeof fetch>()
const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

function lastCall() {
  return fetchMock.mock.calls[0] as [string, RequestInit]
}
function lastCallUrl()     { return new URL(lastCall()[0]) }
function lastCallHeaders() { return lastCall()[1]?.headers as Record<string, string> }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OnetClient', () => {
  describe('searchOccupations', () => {
    it('calls the correct endpoint with query params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse))
      await client.searchOccupations({ keyword: 'software', start: 1, end: 20 })
      const url = lastCallUrl()
      expect(url.pathname).toBe('/ws/online/search')
      expect(url.searchParams.get('keyword')).toBe('software')
      expect(url.searchParams.get('start')).toBe('1')
      expect(url.searchParams.get('end')).toBe('20')
    })

    it('sets the X-API-Key header', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse))
      await client.searchOccupations({ keyword: 'software' })
      expect(lastCallHeaders()['X-API-Key']).toBe('test-api-key')
    })

    it('omits undefined optional params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse))
      await client.searchOccupations({ keyword: 'software' })
      const url = lastCallUrl()
      expect(url.searchParams.has('start')).toBe(false)
      expect(url.searchParams.has('end')).toBe(false)
    })

    it('returns typed search results', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse))
      const result = await client.searchOccupations({ keyword: 'software' })
      expect(result.total).toBe(2)
      expect(result.occupation[0].code).toBe('15-1252.00')
      expect(result.occupation[0].tags.bright_outlook).toBe(true)
    })

    it('throws OnetApiError on a 401 response', async () => {
      fetchMock.mockResolvedValue(mockError(401, 'Unauthorized'))
      await expect(client.searchOccupations({ keyword: 'software' })).rejects.toThrow(OnetApiError)
    })

    it('includes the status code on OnetApiError', async () => {
      fetchMock.mockResolvedValue(mockError(422, 'Invalid keyword'))
      const error = await client.searchOccupations({ keyword: '' }).catch((e) => e)
      expect(error).toBeInstanceOf(OnetApiError)
      expect((error as OnetApiError).status).toBe(422)
    })
  })

  describe('getOccupation', () => {
    it('calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockOverview))
      await client.getOccupation('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/')
    })

    it('returns typed occupation overview', async () => {
      fetchMock.mockResolvedValue(mockOk(mockOverview))
      const result = await client.getOccupation('15-1252.00')
      expect(result.code).toBe('15-1252.00')
      expect(result.description).toBeTruthy()
    })

    it('throws OnetApiError on 404', async () => {
      fetchMock.mockResolvedValue(mockError(404, 'Not found'))
      await expect(client.getOccupation('00-0000.00')).rejects.toThrow(OnetApiError)
    })
  })

  describe('summary section methods', () => {
    it('getOccupationSkills calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationSkills('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/skills')
    })

    it('getOccupationSkills passes pagination params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationSkills('15-1252.00', { start: 5, end: 10 })
      const url = lastCallUrl()
      expect(url.searchParams.get('start')).toBe('5')
      expect(url.searchParams.get('end')).toBe('10')
    })

    it('getOccupationAbilities calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationAbilities('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/abilities')
    })

    it('getOccupationAbilities passes pagination params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationAbilities('15-1252.00', { start: 2, end: 5 })
      const url = lastCallUrl()
      expect(url.searchParams.get('start')).toBe('2')
      expect(url.searchParams.get('end')).toBe('5')
    })

    it('getOccupationKnowledge calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationKnowledge('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/knowledge')
    })

    it('getOccupationWorkStyles calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationWorkStyles('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/work_styles')
    })

    it('getOccupationWorkActivities calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary))
      await client.getOccupationWorkActivities('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/work_activities')
    })

    it('getOccupationWorkContext calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockWorkContext))
      await client.getOccupationWorkContext('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/work_context')
    })

    it('getOccupationWorkContext returns response distributions', async () => {
      fetchMock.mockResolvedValue(mockOk(mockWorkContext))
      const result = await client.getOccupationWorkContext('15-1252.00')
      expect(result.element[0].response[0].percentage_of_respondents).toBe(55)
    })

    it('getOccupationTasks calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTasks))
      await client.getOccupationTasks('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/tasks')
    })

    it('getOccupationTasks returns typed task list', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTasks))
      const result = await client.getOccupationTasks('15-1252.00')
      expect(result.task[0].title).toBe('Develop system specifications.')
    })

    it('getOccupationTechnologySkills calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTechnologySkills))
      await client.getOccupationTechnologySkills('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/technology_skills')
    })

    it('getOccupationTechnologySkills returns category examples', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTechnologySkills))
      const result = await client.getOccupationTechnologySkills('15-1252.00')
      expect(result.category[0].example[0].hot_technology).toBe(true)
    })

    it('getOccupationRelatedOccupations calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockRelatedOccupations))
      await client.getOccupationRelatedOccupations('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/related_occupations')
    })

    it('getOccupationJobZone calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockJobZone))
      await client.getOccupationJobZone('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/job_zone')
    })

    it('getOccupationJobZone returns typed job zone data', async () => {
      fetchMock.mockResolvedValue(mockOk(mockJobZone))
      const result = await client.getOccupationJobZone('15-1252.00')
      expect(result.code).toBe(4)
      expect(result.svp_range).toBe('(7.0 to < 8.0)')
    })

    it('getOccupationInterests calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockInterests))
      await client.getOccupationInterests('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/interests')
    })

    it('getOccupationInterests returns interest code and elements', async () => {
      fetchMock.mockResolvedValue(mockOk(mockInterests))
      const result = await client.getOccupationInterests('15-1252.00')
      expect(result.interest_code).toBe('ICR')
      expect(result.element[0].name).toBe('Investigative')
    })

    it('getOccupationEducation calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockEducation))
      await client.getOccupationEducation('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/education')
    })

    it('getOccupationEducation returns response distribution', async () => {
      fetchMock.mockResolvedValue(mockOk(mockEducation))
      const result = await client.getOccupationEducation('15-1252.00')
      expect(result.response[0].percentage_of_respondents).toBe(46)
    })

    it('getOccupationDetailedWorkActivities calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockDetailedWorkActivities))
      await client.getOccupationDetailedWorkActivities('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/detailed_work_activities')
    })

    it('getOccupationApprenticeship calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockApprenticeship))
      await client.getOccupationApprenticeship('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/apprenticeship')
    })

    it('getOccupationProfessionalAssociations calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockProfessionalAssociations))
      await client.getOccupationProfessionalAssociations('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/professional_associations')
    })

    it('getOccupationProfessionalAssociations returns typed source list', async () => {
      fetchMock.mockResolvedValue(mockOk(mockProfessionalAssociations))
      const result = await client.getOccupationProfessionalAssociations('15-1252.00')
      expect(result.source[0].name).toBe('IEEE')
      expect(result.source[0].category.code).toBe('national')
    })

    it('getOccupationMilitaryCareerSummaries calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockMilitaryCareerSummaries))
      await client.getOccupationMilitaryCareerSummaries('15-1252.00')
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/summary/military_career_summaries')
    })

    it('getOccupationMilitaryCareerSummaries returns typed career summary list', async () => {
      fetchMock.mockResolvedValue(mockOk(mockMilitaryCareerSummaries))
      const result = await client.getOccupationMilitaryCareerSummaries('15-1252.00')
      expect(result.career_summary[0].title).toBe('Software Developer (Army)')
    })
  })
})
