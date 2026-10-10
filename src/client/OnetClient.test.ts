import {describe, it, expect, mock, beforeEach, afterEach} from 'bun:test';
import {OnetClient, OnetApiError} from './OnetClient';
import {OnetRequestError, OnetValidationError} from './errors';
import type {FetchLike} from './OnetTransport';
import type {OccupationOverview} from '../types';

const client = new OnetClient('test-api-key');

// ── Mock fixtures ─────────────────────────────────────────────────────────────

const mockSearchResponse = {
  start: 1,
  end: 2,
  total: 2,
  occupation: [
    {
      href: '/online/occupations/15-1252.00/',
      code: '15-1252.00',
      title: 'Software Developers',
      tags: {bright_outlook: true},
    },
    {
      href: '/online/occupations/15-1253.00/',
      code: '15-1253.00',
      title: 'Software Quality Assurance Analysts',
      tags: {},
    },
  ],
};

const mockOverview = {
  code: '15-1252.00',
  title: 'Software Developers',
  tags: {bright_outlook: true},
  description: 'Research, design, and develop computer and network software.',
  summary_contents: [],
  details_contents: [],
  custom_contents: [],
};

const mockElementSummary = {
  start: 1,
  end: 3,
  total: 3,
  element: [
    {
      id: '2.A.1.a',
      related: '/online/onet_data/skills_basic/2.A.1.a',
      name: 'Reading Comprehension',
      description: '...',
    },
  ],
};

const mockJobZone = {
  code: 4,
  title: 'Considerable Preparation Needed',
  education: "Most of these occupations require a four-year bachelor's degree.",
  related_experience:
    'A considerable amount of work-related skill is required.',
  job_training: 'Employees may need some on-the-job training.',
  job_zone_examples: 'Accountants, Engineers, Pharmacists.',
  svp_range: '(7.0 to < 8.0)',
};

const mockWorkContext = {
  start: 1,
  end: 1,
  total: 1,
  element: [
    {
      id: '4.C.1.a.2.a',
      related: '',
      name: 'Face-to-Face Discussions',
      description: '...',
      response: [{percentage_of_respondents: 55, description: 'Every day'}],
    },
  ],
};

const mockTasks = {
  start: 1,
  end: 1,
  total: 1,
  task: [{id: '13999', related: '', title: 'Develop system specifications.'}],
};

const mockTechnologySkills = {
  start: 1,
  end: 1,
  total: 1,
  category: [
    {
      code: 1,
      related: '',
      title: 'Development Environment Software',
      example: [{title: 'Apache Maven', href: '...', hot_technology: true}],
    },
  ],
};

const mockRelatedOccupations = {
  start: 1,
  end: 1,
  total: 1,
  occupation: [
    {href: '', code: '15-1253.00', title: 'Software QA Analysts', tags: {}},
  ],
};

const mockInterests = {
  interest_code: 'ICR',
  element: [
    {id: '1.B.1.a', related: '', name: 'Investigative', description: '...'},
  ],
};

const mockEducation = {
  response: [
    {code: 6, title: "Bachelor's Degree", percentage_of_respondents: 46},
  ],
};

const mockDetailedWorkActivities = {
  start: 1,
  end: 1,
  total: 1,
  activity: [
    {id: '4.A.1.a.1', title: 'Compile technical information.', related: ''},
  ],
};

const mockApprenticeship = {
  start: 1,
  end: 0,
  total: 0,
  example_title: [],
};

const mockProfessionalAssociations = {
  start: 1,
  end: 1,
  total: 1,
  source: [
    {
      url: 'https://www.ieee.org',
      name: 'IEEE',
      category: {code: 'national' as const, title: 'National'},
    },
  ],
};

const mockMilitaryCareerSummaries = {
  start: 1,
  end: 1,
  total: 1,
  career_summary: [{url: '...', title: 'Software Developer (Army)'}],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockOk(body: unknown) {
  return {ok: true, json: () => Promise.resolve(body)} as Response;
}

function mockError(status: number, text = 'Error', statusText = '') {
  return {
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(text),
  } as Response;
}

// ── Fetch stub ────────────────────────────────────────────────────────────────

const fetchMock = mock<FetchLike>();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function lastCall() {
  return fetchMock.mock.calls[0] as [string, RequestInit];
}
function lastCallUrl() {
  return new URL(lastCall()[0]);
}
function lastCallHeaders() {
  return lastCall()[1]?.headers as Record<string, string>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OnetClient', () => {
  describe('searchOccupations', () => {
    it('calls the correct endpoint with query params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      await client.searchOccupations({keyword: 'software', start: 1, end: 20});
      const url = lastCallUrl();
      expect(url.pathname).toBe('/ws/online/search');
      expect(url.searchParams.get('keyword')).toBe('software');
      expect(url.searchParams.get('start')).toBe('1');
      expect(url.searchParams.get('end')).toBe('20');
    });

    it('sets the X-API-Key header', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      await client.searchOccupations({keyword: 'software'});
      expect(lastCallHeaders()['X-API-Key']).toBe('test-api-key');
    });

    it('omits undefined optional params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      await client.searchOccupations({keyword: 'software'});
      const url = lastCallUrl();
      expect(url.searchParams.has('start')).toBe(false);
      expect(url.searchParams.has('end')).toBe(false);
    });

    it('returns typed search results', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      const result = await client.searchOccupations({keyword: 'software'});
      expect(result.total).toBe(2);
      expect(result.occupation[0].code).toBe('15-1252.00');
      expect(result.occupation[0].tags.bright_outlook).toBe(true);
    });

    it('throws OnetApiError on a 401 response', async () => {
      fetchMock.mockResolvedValue(mockError(401, 'Unauthorized'));
      await expect(
        client.searchOccupations({keyword: 'software'})
      ).rejects.toThrow(OnetApiError);
    });

    it('includes the status code on OnetApiError', async () => {
      fetchMock.mockResolvedValue(mockError(422, 'Invalid parameter'));
      const error = await client
        .searchOccupations({keyword: 'software'})
        .catch(e => e);
      expect(error).toBeInstanceOf(OnetApiError);
      expect((error as OnetApiError).status).toBe(422);
    });
  });

  describe('getOccupationSummary section validation', () => {
    it.each([
      '..',
      '../',
      '../../../../../../internal/admin',
      'skills?injected=1',
      'skills#fragment',
      'skills/extra',
      '__proto__',
      'constructor',
      '',
    ])('rejects the section %p without sending a request', async section => {
      await expect(
        client.getOccupationSummary(
          '15-1252.00',
          section as unknown as 'skills'
        )
      ).rejects.toBeInstanceOf(OnetValidationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still accepts every known section', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationSummary('15-1252.00', 'work_styles');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/work_styles'
      );
    });
  });

  describe('pagination and keyword validation', () => {
    it.each([
      [{start: 0}],
      [{start: -1}],
      [{start: 1.5}],
      [{end: 0}],
      [{end: 2.5}],
      [{start: Number.NaN}],
      [{start: 5, end: 4}],
    ])('rejects page bounds %p without sending a request', async params => {
      await expect(
        client.getOccupationSummary('15-1252.00', 'skills', params)
      ).rejects.toBeInstanceOf(OnetValidationError);
      await expect(
        client.searchOccupations({keyword: 'nurse', ...params})
      ).rejects.toBeInstanceOf(OnetValidationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(['', '   ', '\t\n'])(
      'rejects the blank keyword %p without sending a request',
      async keyword => {
        await expect(
          client.searchOccupations({keyword})
        ).rejects.toBeInstanceOf(OnetValidationError);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );

    it('accepts valid bounds', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      await client.searchOccupations({keyword: 'nurse', start: 1, end: 1});
      expect(lastCallUrl().searchParams.get('end')).toBe('1');
    });
  });

  describe('getOccupation', () => {
    it('calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockOverview));
      await client.getOccupation('15-1252.00');
      expect(lastCallUrl().pathname).toBe('/ws/online/occupations/15-1252.00/');
    });

    it('returns typed occupation overview', async () => {
      fetchMock.mockResolvedValue(mockOk(mockOverview));
      const result = await client.getOccupation('15-1252.00');
      expect(result.code).toBe('15-1252.00');
      expect(result.description).toBeTruthy();
    });

    it('types bright_outlook items as {code, title} per the OpenAPI schema', async () => {
      // Shape taken from /online/occupations/{code}/ in the OpenAPI spec.
      const overview: OccupationOverview = {
        ...mockOverview,
        bright_outlook: [{code: 'GROWTH', title: 'Rapid Growth'}],
      };
      fetchMock.mockResolvedValue(mockOk(overview));
      const result = await client.getOccupation('15-1252.00');
      const outlook = result.bright_outlook?.[0];
      expect(outlook?.code).toBe('GROWTH');
      expect(outlook?.title).toBe('Rapid Growth');
      // @ts-expect-error bright_outlook items have no href
      void outlook?.href;
    });

    it('throws OnetApiError on 404', async () => {
      fetchMock.mockResolvedValue(mockError(404, 'Not found'));
      await expect(client.getOccupation('00-0000.00')).rejects.toThrow(
        OnetApiError
      );
    });
  });

  describe('summary section methods', () => {
    it('getOccupationSkills calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationSkills('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/skills'
      );
    });

    it('getOccupationSkills passes pagination params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationSkills('15-1252.00', {start: 5, end: 10});
      const url = lastCallUrl();
      expect(url.searchParams.get('start')).toBe('5');
      expect(url.searchParams.get('end')).toBe('10');
    });

    it('getOccupationAbilities calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationAbilities('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/abilities'
      );
    });

    it('getOccupationAbilities passes pagination params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationAbilities('15-1252.00', {start: 2, end: 5});
      const url = lastCallUrl();
      expect(url.searchParams.get('start')).toBe('2');
      expect(url.searchParams.get('end')).toBe('5');
    });

    it('getOccupationKnowledge calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationKnowledge('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/knowledge'
      );
    });

    it('getOccupationWorkStyles calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationWorkStyles('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/work_styles'
      );
    });

    it('getOccupationWorkActivities calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationWorkActivities('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/work_activities'
      );
    });

    it('getOccupationWorkContext calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockWorkContext));
      await client.getOccupationWorkContext('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/work_context'
      );
    });

    it('getOccupationWorkContext returns response distributions', async () => {
      fetchMock.mockResolvedValue(mockOk(mockWorkContext));
      const result = await client.getOccupationWorkContext('15-1252.00');
      expect(result.element[0].response[0].percentage_of_respondents).toBe(55);
    });

    it('getOccupationTasks calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTasks));
      await client.getOccupationTasks('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/tasks'
      );
    });

    it('getOccupationTasks returns typed task list', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTasks));
      const result = await client.getOccupationTasks('15-1252.00');
      expect(result.task[0].title).toBe('Develop system specifications.');
    });

    it('getOccupationTechnologySkills calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTechnologySkills));
      await client.getOccupationTechnologySkills('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/technology_skills'
      );
    });

    it('getOccupationTechnologySkills returns category examples', async () => {
      fetchMock.mockResolvedValue(mockOk(mockTechnologySkills));
      const result = await client.getOccupationTechnologySkills('15-1252.00');
      expect(result.category[0].example[0].hot_technology).toBe(true);
    });

    it('getOccupationRelatedOccupations calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockRelatedOccupations));
      await client.getOccupationRelatedOccupations('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/related_occupations'
      );
    });

    it('getOccupationJobZone calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockJobZone));
      await client.getOccupationJobZone('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/job_zone'
      );
    });

    it('getOccupationJobZone returns typed job zone data', async () => {
      fetchMock.mockResolvedValue(mockOk(mockJobZone));
      const result = await client.getOccupationJobZone('15-1252.00');
      expect(result.code).toBe(4);
      expect(result.svp_range).toBe('(7.0 to < 8.0)');
    });

    it('getOccupationInterests calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockInterests));
      await client.getOccupationInterests('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/interests'
      );
    });

    it('getOccupationInterests returns interest code and elements', async () => {
      fetchMock.mockResolvedValue(mockOk(mockInterests));
      const result = await client.getOccupationInterests('15-1252.00');
      expect(result.interest_code).toBe('ICR');
      expect(result.element[0].name).toBe('Investigative');
    });

    it('getOccupationEducation calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockEducation));
      await client.getOccupationEducation('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/education'
      );
    });

    it('getOccupationEducation returns response distribution', async () => {
      fetchMock.mockResolvedValue(mockOk(mockEducation));
      const result = await client.getOccupationEducation('15-1252.00');
      expect(result.response[0].percentage_of_respondents).toBe(46);
    });

    it('getOccupationDetailedWorkActivities calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockDetailedWorkActivities));
      await client.getOccupationDetailedWorkActivities('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/detailed_work_activities'
      );
    });

    it('getOccupationApprenticeship calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockApprenticeship));
      await client.getOccupationApprenticeship('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/apprenticeship'
      );
    });

    it('getOccupationProfessionalAssociations calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockProfessionalAssociations));
      await client.getOccupationProfessionalAssociations('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/professional_associations'
      );
    });

    it('getOccupationProfessionalAssociations returns typed source list', async () => {
      fetchMock.mockResolvedValue(mockOk(mockProfessionalAssociations));
      const result =
        await client.getOccupationProfessionalAssociations('15-1252.00');
      expect(result.source[0].name).toBe('IEEE');
      expect(result.source[0].category.code).toBe('national');
    });

    it('getOccupationMilitaryCareerSummaries calls the correct path', async () => {
      fetchMock.mockResolvedValue(mockOk(mockMilitaryCareerSummaries));
      await client.getOccupationMilitaryCareerSummaries('15-1252.00');
      expect(lastCallUrl().pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/military_career_summaries'
      );
    });

    it('getOccupationMilitaryCareerSummaries returns typed career summary list', async () => {
      fetchMock.mockResolvedValue(mockOk(mockMilitaryCareerSummaries));
      const result =
        await client.getOccupationMilitaryCareerSummaries('15-1252.00');
      expect(result.career_summary[0].title).toBe('Software Developer (Army)');
    });
  });

  describe('getOccupationSummary', () => {
    it('requests the named section with pagination params', async () => {
      fetchMock.mockResolvedValue(mockOk(mockElementSummary));
      await client.getOccupationSummary('15-1252.00', 'work_styles', {
        start: 3,
        end: 6,
      });
      const url = lastCallUrl();
      expect(url.pathname).toBe(
        '/ws/online/occupations/15-1252.00/summary/work_styles'
      );
      expect(url.searchParams.get('start')).toBe('3');
      expect(url.searchParams.get('end')).toBe('6');
    });
  });

  describe('code validation', () => {
    it('rejects a malformed code without sending a request', async () => {
      const error = await client
        .getOccupationSkills('not-a-code')
        .catch(e => e);
      expect(error).toBeInstanceOf(OnetValidationError);
      expect((error as Error).message).toContain('not-a-code');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a path-traversal attempt', async () => {
      await expect(client.getOccupation('../../about')).rejects.toThrow(
        OnetValidationError
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('error reporting', () => {
    it('includes the endpoint, status and body in the message', async () => {
      fetchMock.mockResolvedValue(
        mockError(404, 'Occupation not found', 'Not Found')
      );
      const error = (await client
        .getOccupation('00-0000.00')
        .catch(e => e)) as OnetApiError;
      expect(error.message).toBe(
        'O*NET request GET /online/occupations/00-0000.00/ failed with HTTP 404 Not Found: Occupation not found'
      );
      expect(error.endpoint).toBe('/online/occupations/00-0000.00/');
    });

    it('truncates very long error bodies', async () => {
      fetchMock.mockResolvedValue(mockError(500, 'x'.repeat(2000)));
      const error = (await client
        .searchOccupations({keyword: 'a'})
        .catch(e => e)) as OnetApiError;
      expect(error.message.length).toBeLessThan(700);
      expect(error.message.endsWith('…')).toBe(true);
    });

    it('wraps network failures in OnetRequestError with the cause', async () => {
      const cause = new TypeError('fetch failed');
      fetchMock.mockRejectedValue(cause);
      const error = (await client
        .searchOccupations({keyword: 'a'})
        .catch(e => e)) as OnetRequestError;
      expect(error).toBeInstanceOf(OnetRequestError);
      expect(error.message).toContain('/online/search');
      expect(error.cause).toBe(cause);
    });

    it('wraps invalid JSON in OnetRequestError', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      } as Response);
      await expect(client.searchOccupations({keyword: 'a'})).rejects.toThrow(
        OnetRequestError
      );
    });

    it('passes abort errors through unwrapped', async () => {
      fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));
      const error = (await client
        .searchOccupations({keyword: 'a'})
        .catch(e => e)) as Error;
      expect(error.name).toBe('AbortError');
    });
  });

  describe('options', () => {
    it('forwards the abort signal to fetch', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      const controller = new AbortController();
      await client.searchOccupations(
        {keyword: 'a'},
        {signal: controller.signal}
      );
      expect(lastCall()[1].signal).toBe(controller.signal);
    });

    it('uses a custom base URL and fetch implementation', async () => {
      const customFetch = mock<FetchLike>().mockResolvedValue(
        mockOk(mockSearchResponse)
      );
      const proxied = new OnetClient(undefined, {
        baseUrl: 'https://example.test/onet/',
        fetch: customFetch,
      });
      await proxied.searchOccupations({keyword: 'a'});
      const [url, init] = customFetch.mock.calls[0] as [string, RequestInit];
      expect(new URL(url).href).toBe(
        'https://example.test/onet/online/search?keyword=a'
      );
      expect(
        (init.headers as Record<string, string>)['X-API-Key']
      ).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('baseUrl and API key validation', () => {
    const okFetch: FetchLike = mock(() =>
      Promise.resolve(new Response('{}', {status: 200}))
    );

    it.each([
      'javascript:alert(1)/online/search',
      'file:///C:/Windows/win.ini',
      'ftp://example.com/ws',
    ])('rejects the non-HTTP baseUrl %s before any request', async baseUrl => {
      const fetchSpy = mock(okFetch);
      const guarded = new OnetClient('key', {baseUrl, fetch: fetchSpy});
      await expect(guarded.getOccupation('15-1252.00')).rejects.toBeInstanceOf(
        OnetValidationError
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects a baseUrl containing credentials', async () => {
      const fetchSpy = mock(okFetch);
      const guarded = new OnetClient('key', {
        baseUrl: 'https://user:secret@evil.test/ws',
        fetch: fetchSpy,
      });
      await expect(guarded.getOccupation('15-1252.00')).rejects.toBeInstanceOf(
        OnetValidationError
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each(['bad\r\nX-Evil: 1', 'bad\nkey', 'bad\0key'])(
      'rejects an API key containing control characters',
      key => {
        expect(() => new OnetClient(key)).toThrow(OnetValidationError);
      }
    );

    it('refuses to follow redirects', async () => {
      const fetchSpy = mock(okFetch);
      await new OnetClient('key', {fetch: fetchSpy}).getOccupation(
        '15-1252.00'
      );
      expect(fetchSpy.mock.calls[0]?.[1].redirect).toBe('error');
    });
  });

  describe('relative baseUrl', () => {
    it('resolves against the page origin in a browser', async () => {
      const originalLocation = globalThis.location;
      Object.defineProperty(globalThis, 'location', {
        value: {href: 'https://app.example/dashboard'},
        configurable: true,
      });
      try {
        fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
        await new OnetClient(undefined, {
          baseUrl: '/api/onet',
        }).searchOccupations({keyword: 'a'});
        expect(lastCall()[0]).toBe(
          'https://app.example/api/onet/online/search?keyword=a'
        );
      } finally {
        Object.defineProperty(globalThis, 'location', {
          value: originalLocation,
          configurable: true,
        });
      }
    });

    it('fails with a descriptive error when there is no page to resolve against', async () => {
      const originalLocation = globalThis.location;
      Object.defineProperty(globalThis, 'location', {
        value: undefined,
        configurable: true,
      });
      try {
        const error = (await new OnetClient(undefined, {baseUrl: '/api/onet'})
          .searchOccupations({keyword: 'a'})
          .catch(e => e)) as Error;
        expect(error).toBeInstanceOf(OnetValidationError);
        expect(error.message).toContain('relative baseUrl');
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(globalThis, 'location', {
          value: originalLocation,
          configurable: true,
        });
      }
    });
  });

  describe('caching', () => {
    it('is disabled by default', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      await client.searchOccupations({keyword: 'a'});
      await client.searchOccupations({keyword: 'a'});
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('reuses responses and shares in-flight requests when enabled', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      const cached = new OnetClient('key', {cacheTtlMs: 60_000});
      await Promise.all([
        cached.searchOccupations({keyword: 'a'}),
        cached.searchOccupations({keyword: 'a'}),
      ]);
      await cached.searchOccupations({keyword: 'a'});
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await cached.searchOccupations({keyword: 'b'});
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not cache failures', async () => {
      fetchMock
        .mockResolvedValueOnce(mockError(500))
        .mockResolvedValueOnce(mockOk(mockSearchResponse));
      const cached = new OnetClient('key', {cacheTtlMs: 60_000});
      await cached.searchOccupations({keyword: 'a'}).catch(() => undefined);
      const result = await cached.searchOccupations({keyword: 'a'});
      expect(result.total).toBe(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('evicts the oldest entry beyond cacheMaxEntries', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(mockOk(mockSearchResponse))
      );
      const cached = new OnetClient('key', {
        cacheTtlMs: 60_000,
        cacheMaxEntries: 1,
      });
      await cached.searchOccupations({keyword: 'a'});
      await cached.searchOccupations({keyword: 'b'});
      await cached.searchOccupations({keyword: 'a'});
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('clearCache forces a fresh request', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(mockOk(mockSearchResponse))
      );
      const cached = new OnetClient('key', {cacheTtlMs: 60_000});
      await cached.searchOccupations({keyword: 'a'});
      cached.clearCache();
      await cached.searchOccupations({keyword: 'a'});
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('lets one caller abort without cancelling the shared request', async () => {
      fetchMock.mockResolvedValue(mockOk(mockSearchResponse));
      const cached = new OnetClient('key', {cacheTtlMs: 60_000});
      const controller = new AbortController();
      const aborted = cached.searchOccupations(
        {keyword: 'a'},
        {signal: controller.signal}
      );
      const other = cached.searchOccupations({keyword: 'a'});
      controller.abort();
      await expect(aborted).rejects.toBeDefined();
      expect((await other).total).toBe(2);
    });
  });
});
