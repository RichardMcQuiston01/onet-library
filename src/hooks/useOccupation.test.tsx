import {useLayoutEffect} from 'react';
import {describe, it, expect, mock} from 'bun:test';
import {renderHook, waitFor, act} from '@testing-library/react';
import {
  useOccupation,
  useOccupationSkills,
  useOccupationAbilities,
  useOccupationKnowledge,
  useOccupationTasks,
  useOccupationJobZone,
  useOccupationSummary,
  useOccupationWorkStyles,
  useOccupationEducation,
} from './useOccupation';
import type {OnetClient} from '../client/OnetClient';

const mockOverview = {
  code: '15-1252.00',
  title: 'Software Developers',
  tags: {bright_outlook: true},
  description: 'Research, design, and develop computer and network software.',
  summary_contents: [],
  details_contents: [],
  custom_contents: [],
};

const mockElements = {
  start: 1,
  end: 1,
  total: 1,
  element: [
    {
      id: '2.A.1.a',
      related: '',
      name: 'Reading Comprehension',
      description: '...',
    },
  ],
};

const mockTasks = {
  start: 1,
  end: 1,
  total: 1,
  task: [{id: '13999', related: '', title: 'Develop system specifications.'}],
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

const summaryFixtures: Record<string, unknown> = {
  skills: mockElements,
  abilities: mockElements,
  knowledge: mockElements,
  work_styles: mockElements,
  work_activities: mockElements,
  tasks: mockTasks,
  job_zone: mockJobZone,
};

function makeMockClient(
  overrides?: Partial<Record<keyof OnetClient, unknown>>
): OnetClient {
  return {
    getOccupation: mock(() => Promise.resolve(mockOverview)),
    getOccupationSummary: mock((_code: string, section: string) =>
      Promise.resolve(summaryFixtures[section] ?? {start: 1, end: 0, total: 0})
    ),
    ...overrides,
  } as unknown as OnetClient;
}

describe('useOccupation', () => {
  it('starts idle when code is null', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupation(client, null));
    expect(result.current).toEqual({data: null, loading: false, error: null});
  });

  it('sets loading true on initial fetch', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupation(client, '15-1252.00'));
    expect(result.current.loading).toBe(true);
  });

  it('populates data after fetch resolves', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupation(client, '15-1252.00'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockOverview);
    expect(result.current.error).toBeNull();
  });

  it('sets error on failure', async () => {
    const client = makeMockClient({
      getOccupation: mock(() => Promise.reject(new Error('Not found'))),
    });
    const {result} = renderHook(() => useOccupation(client, '00-0000.00'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('Not found');
    expect(result.current.data).toBeNull();
  });

  it('resets to idle when code becomes null', async () => {
    const client = makeMockClient();
    const {result, rerender} = renderHook(
      ({code}: {code: string | null}) => useOccupation(client, code),
      {initialProps: {code: '15-1252.00' as string | null}}
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());

    rerender({code: null});
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refetches when code changes', async () => {
    const getOccupation = mock(() => Promise.resolve(mockOverview));
    const client = makeMockClient({getOccupation});
    const {rerender} = renderHook(
      ({code}: {code: string}) => useOccupation(client, code),
      {initialProps: {code: '15-1252.00'}}
    );
    await waitFor(() => expect(getOccupation).toHaveBeenCalledTimes(1));
    rerender({code: '15-1253.00'});
    await waitFor(() => expect(getOccupation).toHaveBeenCalledTimes(2));
    expect(getOccupation).toHaveBeenLastCalledWith('15-1253.00', {
      signal: expect.any(AbortSignal),
    });
  });
});

describe('useOccupationSkills', () => {
  it('fetches skills for the given code', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationSkills(client, '15-1252.00')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.element[0].name).toBe('Reading Comprehension');
    expect(result.current.error).toBeNull();
  });

  it('stays idle when code is null', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupationSkills(client, null));
    expect(result.current).toEqual({data: null, loading: false, error: null});
  });
});

describe('useOccupationAbilities', () => {
  it('fetches abilities for the given code', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationAbilities(client, '15-1252.00')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.element[0].name).toBe('Reading Comprehension');
    expect(result.current.error).toBeNull();
  });

  it('stays idle when code is null', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupationAbilities(client, null));
    expect(result.current).toEqual({data: null, loading: false, error: null});
  });
});

describe('useOccupationKnowledge', () => {
  it('fetches knowledge for the given code', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationKnowledge(client, '15-1252.00')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('stays idle when code is null', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupationKnowledge(client, null));
    expect(result.current).toEqual({data: null, loading: false, error: null});
  });
});

describe('useOccupationTasks', () => {
  it('fetches tasks for the given code', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupationTasks(client, '15-1252.00'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.task[0].title).toBe(
      'Develop system specifications.'
    );
    expect(result.current.error).toBeNull();
  });

  it('stays idle when code is null', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupationTasks(client, null));
    expect(result.current).toEqual({data: null, loading: false, error: null});
  });
});

describe('useOccupationJobZone', () => {
  it('fetches job zone data', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationJobZone(client, '15-1252.00')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.code).toBe(4);
    expect(result.current.error).toBeNull();
  });

  it('stays idle when code is null', () => {
    const client = makeMockClient();
    const {result} = renderHook(() => useOccupationJobZone(client, null));
    expect(result.current).toEqual({data: null, loading: false, error: null});
  });
});

describe('useOccupationSummary', () => {
  it('requests the named section with the code and page bounds', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationSummary(client, '15-1252.00', 'work_styles', {
        start: 2,
        end: 4,
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(client.getOccupationSummary).toHaveBeenCalledWith(
      '15-1252.00',
      'work_styles',
      {start: 2, end: 4},
      {signal: expect.any(AbortSignal)}
    );
  });

  it('does not refetch when re-rendered with an equal inline params object', async () => {
    const client = makeMockClient();
    const {rerender} = renderHook(() =>
      useOccupationSkills(client, '15-1252.00', {start: 1, end: 10})
    );
    await waitFor(() =>
      expect(client.getOccupationSummary).toHaveBeenCalledTimes(1)
    );
    rerender();
    rerender();
    expect(client.getOccupationSummary).toHaveBeenCalledTimes(1);
  });

  it('refetches when the page bounds change', async () => {
    const client = makeMockClient();
    const {rerender} = renderHook(
      ({start}: {start: number}) =>
        useOccupationSkills(client, '15-1252.00', {start, end: start + 9}),
      {initialProps: {start: 1}}
    );
    await waitFor(() =>
      expect(client.getOccupationSummary).toHaveBeenCalledTimes(1)
    );
    rerender({start: 11});
    await waitFor(() =>
      expect(client.getOccupationSummary).toHaveBeenCalledTimes(2)
    );
  });
});

describe('section hooks', () => {
  it('useOccupationWorkStyles requests the work_styles section', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationWorkStyles(client, '15-1252.00')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(
      (client.getOccupationSummary as ReturnType<typeof mock>).mock.calls[0][1]
    ).toBe('work_styles');
  });

  it('useOccupationEducation requests the education section', async () => {
    const client = makeMockClient();
    const {result} = renderHook(() =>
      useOccupationEducation(client, '15-1252.00')
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(
      (client.getOccupationSummary as ReturnType<typeof mock>).mock.calls[0][1]
    ).toBe('education');
  });
});

describe('request lifecycle', () => {
  it('keeps the previous data visible while a refetch loads', async () => {
    const pending: Array<(value: typeof mockOverview) => void> = [];
    const getOccupation = mock(
      () =>
        new Promise<typeof mockOverview>(resolve => {
          pending.push(resolve);
        })
    );
    const client = makeMockClient({getOccupation});
    const {result, rerender} = renderHook(
      ({code}: {code: string}) => useOccupation(client, code),
      {initialProps: {code: '15-1252.00'}}
    );
    await act(async () => {
      pending[0](mockOverview);
    });
    expect(result.current.data).toEqual(mockOverview);

    rerender({code: '15-1253.00'});
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual(mockOverview);
  });

  it('aborts the in-flight request when the code changes', async () => {
    const signals: AbortSignal[] = [];
    const getOccupation = mock(
      (_code: string, options: {signal: AbortSignal}) => {
        signals.push(options.signal);
        return new Promise<never>(() => {});
      }
    );
    const client = makeMockClient({getOccupation});
    const {rerender} = renderHook(
      ({code}: {code: string}) => useOccupation(client, code),
      {initialProps: {code: '15-1252.00'}}
    );
    rerender({code: '15-1253.00'});
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('aborts the in-flight request on unmount', async () => {
    let signal: AbortSignal | undefined;
    const getOccupation = mock(
      (_code: string, options: {signal: AbortSignal}) => {
        signal = options.signal;
        return new Promise<never>(() => {});
      }
    );
    const client = makeMockClient({getOccupation});
    const {unmount} = renderHook(() => useOccupation(client, '15-1252.00'));
    await waitFor(() => expect(signal).toBeDefined());
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('ignores a superseded response that resolves late', async () => {
    const resolvers = new Map<string, (value: typeof mockOverview) => void>();
    const getOccupation = mock(
      (code: string) =>
        new Promise<typeof mockOverview>(resolve => {
          resolvers.set(code, resolve);
        })
    );
    const client = makeMockClient({getOccupation});
    const {result, rerender} = renderHook(
      ({code}: {code: string}) => useOccupation(client, code),
      {initialProps: {code: '15-1252.00'}}
    );
    rerender({code: '15-1253.00'});
    const newer = {...mockOverview, code: '15-1253.00'};
    await act(async () => {
      resolvers.get('15-1253.00')?.(newer);
    });
    await act(async () => {
      resolvers.get('15-1252.00')?.(mockOverview);
    });
    expect(result.current.data?.code).toBe('15-1253.00');
  });
});

describe('stale data across input changes', () => {
  it('reports loading on the very first render with a new code', async () => {
    const client = makeMockClient();
    const renders: {code: string; loading: boolean; dataCode?: string}[] = [];
    const {rerender} = renderHook(
      ({code}: {code: string | null}) => {
        const result = useOccupation(client, code);
        // Record committed output only; React discards the render pass that
        // adjusts state, so pushing from the render body would be misleading.
        useLayoutEffect(() => {
          renders.push({
            code: String(code),
            loading: result.loading,
            dataCode: result.data?.code,
          });
        });
        return result;
      },
      {initialProps: {code: '15-1252.00'} as {code: string | null}}
    );
    await waitFor(() => expect(renders.at(-1)?.loading).toBe(false));

    renders.length = 0;
    rerender({code: '29-1141.00'});
    // No render for the new code may look "finished" while holding old data.
    expect(renders.every(entry => entry.loading)).toBe(true);

    renders.length = 0;
    rerender({code: null});
    expect(renders.every(entry => !entry.loading)).toBe(true);
    renders.length = 0;
    rerender({code: '15-1252.00'});
    expect(renders[0]?.loading).toBe(true);
  });

  it('keeps the previous data when a refetch fails', async () => {
    const getOccupation = mock()
      .mockResolvedValueOnce(mockOverview)
      .mockRejectedValueOnce(new Error('Not found'));
    const client = makeMockClient({getOccupation});
    const {result, rerender} = renderHook(
      ({code}) => useOccupation(client, code),
      {initialProps: {code: '15-1252.00'}}
    );
    await waitFor(() => expect(result.current.data).toEqual(mockOverview));

    rerender({code: '29-1141.00'});
    await waitFor(() =>
      expect(result.current.error?.message).toBe('Not found')
    );
    expect(result.current.data).toEqual(mockOverview);
    expect(result.current.loading).toBe(false);
  });
});
