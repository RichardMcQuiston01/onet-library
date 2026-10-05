import {describe, it, expect, mock} from 'bun:test';
import {renderHook, act} from '@testing-library/react';
import {useOccupationSearch} from './useOccupationSearch';
import type {OnetClient} from '../client/OnetClient';

const mockData = {
  start: 1,
  end: 1,
  total: 1,
  occupation: [
    {
      href: '/online/occupations/15-1252.00/',
      code: '15-1252.00',
      title: 'Software Developers',
      tags: {bright_outlook: true},
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeMockClient(overrides?: Record<string, any>): OnetClient {
  return {
    searchOccupations: mock(() => Promise.resolve(mockData)),
    ...overrides,
  } as unknown as OnetClient;
}

describe('useOccupationSearch', () => {
  it('starts with empty state', () => {
    const {result} = renderHook(() => useOccupationSearch(makeMockClient()));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading while the request is in flight', async () => {
    let resolve!: (value: typeof mockData) => void;
    const client = makeMockClient({
      searchOccupations: mock(
        () =>
          new Promise(r => {
            resolve = r;
          })
      ),
    });

    const {result} = renderHook(() => useOccupationSearch(client));

    act(() => {
      result.current.search({keyword: 'software'});
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve(mockData);
    });
    expect(result.current.loading).toBe(false);
  });

  it('populates data on success', async () => {
    const {result} = renderHook(() => useOccupationSearch(makeMockClient()));

    await act(async () => {
      await result.current.search({keyword: 'software'});
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error and clears data on failure', async () => {
    const client = makeMockClient({
      searchOccupations: mock(() => Promise.reject(new Error('Network error'))),
    });

    const {result} = renderHook(() => useOccupationSearch(client));

    await act(async () => {
      await result.current.search({keyword: 'software'});
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('clears a previous error on a successful retry', async () => {
    const searchOccupations = mock()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockData);

    const {result} = renderHook(() =>
      useOccupationSearch(makeMockClient({searchOccupations}))
    );

    await act(async () => {
      await result.current.search({keyword: 'software'});
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.search({keyword: 'software'});
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockData);
  });

  it('ignores an earlier search that resolves after a newer one', async () => {
    const resolvers = new Map<string, (value: typeof mockData) => void>();
    const searchOccupations = mock(
      ({keyword}: {keyword: string}) =>
        new Promise<typeof mockData>(resolve => {
          resolvers.set(keyword, resolve);
        })
    );
    const {result} = renderHook(() =>
      useOccupationSearch(makeMockClient({searchOccupations}))
    );

    act(() => {
      void result.current.search({keyword: 'nurse'});
    });
    act(() => {
      void result.current.search({keyword: 'pilot'});
    });

    const pilotData = {...mockData, total: 7};
    await act(async () => {
      resolvers.get('pilot')?.(pilotData);
    });
    await act(async () => {
      resolvers.get('nurse')?.(mockData);
    });

    expect(result.current.data).toEqual(pilotData);
    expect(result.current.loading).toBe(false);
  });

  it('aborts the previous request when a new search starts', async () => {
    const signals: AbortSignal[] = [];
    const searchOccupations = mock(
      (_params: unknown, options: {signal: AbortSignal}) => {
        signals.push(options.signal);
        return new Promise<never>(() => {});
      }
    );
    const {result} = renderHook(() =>
      useOccupationSearch(makeMockClient({searchOccupations}))
    );

    act(() => {
      void result.current.search({keyword: 'nurse'});
    });
    act(() => {
      void result.current.search({keyword: 'pilot'});
    });

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('aborts the in-flight request on unmount', () => {
    let signal: AbortSignal | undefined;
    const searchOccupations = mock(
      (_params: unknown, options: {signal: AbortSignal}) => {
        signal = options.signal;
        return new Promise<never>(() => {});
      }
    );
    const {result, unmount} = renderHook(() =>
      useOccupationSearch(makeMockClient({searchOccupations}))
    );

    act(() => {
      void result.current.search({keyword: 'nurse'});
    });
    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('keeps previous results visible while a new search loads', async () => {
    let resolveSecond!: (value: typeof mockData) => void;
    const searchOccupations = mock()
      .mockResolvedValueOnce(mockData)
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecond = resolve;
          })
      );
    const {result} = renderHook(() =>
      useOccupationSearch(makeMockClient({searchOccupations}))
    );

    await act(async () => {
      await result.current.search({keyword: 'software'});
    });
    act(() => {
      void result.current.search({keyword: 'nurse'});
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual(mockData);
    await act(async () => {
      resolveSecond(mockData);
    });
  });
});
