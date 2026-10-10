import {describe, it, expect, mock, afterEach} from 'bun:test';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {OccupationSearch} from './OccupationSearch';
import {OnetApiError} from '../client/errors';
import type {OnetClient} from '../client/OnetClient';
import type {OccupationSearchParams} from '../types';

afterEach(cleanup);

function makeResults(start: number, end: number, total: number) {
  return {
    start,
    end,
    total,
    occupation: Array.from({length: end - start + 1}, (_, index) => ({
      href: '',
      code: `15-12${String(start + index).padStart(2, '0')}.00`,
      title: `Occupation ${start + index}`,
      tags: {bright_outlook: index === 0},
    })),
  };
}

function makeClient(total = 5) {
  const searchOccupations = mock((params: OccupationSearchParams) =>
    Promise.resolve(
      makeResults(params.start ?? 1, Math.min(params.end ?? 20, total), total)
    )
  );
  return {
    client: {searchOccupations} as unknown as OnetClient,
    searchOccupations,
  };
}

describe('OccupationSearch', () => {
  it('searches the trimmed keyword for the first page', async () => {
    const {client, searchOccupations} = makeClient();
    render(<OccupationSearch client={client} pageSize={2} />);
    await userEvent.type(
      screen.getByRole('searchbox', {name: 'Search occupations'}),
      '  nurse  '
    );
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));

    expect(searchOccupations.mock.calls[0][0]).toEqual({
      keyword: 'nurse',
      start: 1,
      end: 2,
    });
    expect(await screen.findByText('5 results')).toBeDefined();
    expect(screen.getByText(/Occupation 1/).textContent).toContain('★');
  });

  it.each([0, -3, 2.5, Number.NaN])(
    'falls back to the default page size for the invalid pageSize %p',
    async pageSize => {
      const {client, searchOccupations} = makeClient();
      render(<OccupationSearch client={client} pageSize={pageSize} />);
      await userEvent.type(screen.getByRole('searchbox'), 'nurse');
      await userEvent.click(screen.getByRole('button', {name: 'Search'}));

      expect(searchOccupations.mock.calls[0][0]).toEqual({
        keyword: 'nurse',
        start: 1,
        end: 20,
      });
    }
  );

  it('pages forward and back using the submitted keyword', async () => {
    const {client, searchOccupations} = makeClient();
    render(<OccupationSearch client={client} pageSize={2} />);
    const input = screen.getByRole('searchbox');
    await userEvent.type(input, 'nurse');
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));
    await screen.findByText('1–2 of 5');

    // Unsubmitted edits must not leak into paging.
    await userEvent.type(input, 'xyz');
    await userEvent.click(screen.getByRole('button', {name: 'Next'}));
    await screen.findByText('3–4 of 5');
    expect(searchOccupations.mock.calls[1][0]).toEqual({
      keyword: 'nurse',
      start: 3,
      end: 4,
    });

    await userEvent.click(screen.getByRole('button', {name: 'Previous'}));
    await screen.findByText('1–2 of 5');
    expect(searchOccupations.mock.calls[2][0]).toEqual({
      keyword: 'nurse',
      start: 1,
      end: 2,
    });
  });

  it('renders results as buttons that call onSelect', async () => {
    const {client} = makeClient(1);
    const onSelect = mock();
    render(<OccupationSearch client={client} onSelect={onSelect} />);
    await userEvent.type(screen.getByRole('searchbox'), 'nurse');
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));
    await userEvent.click(
      await screen.findByRole('button', {name: /Occupation 1/})
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].code).toBe('15-1201.00');
  });

  it('uses renderOccupation for each row', async () => {
    const {client} = makeClient(1);
    render(
      <OccupationSearch
        client={client}
        renderOccupation={occupation => <em>{occupation.code}</em>}
      />
    );
    await userEvent.type(screen.getByRole('searchbox'), 'nurse');
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));

    expect((await screen.findByText('15-1201.00')).tagName).toBe('EM');
  });

  it('shows a fixed message for generic failures', async () => {
    const client = {
      searchOccupations: mock(() =>
        Promise.reject(new Error('Quota exceeded'))
      ),
    } as unknown as OnetClient;
    render(<OccupationSearch client={client} />);
    await userEvent.type(screen.getByRole('searchbox'), 'nurse');
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The occupation search failed. Please try again.'
    );
  });

  it('shows the status but never the upstream body for API errors', async () => {
    const client = {
      searchOccupations: mock(() =>
        Promise.reject(
          new OnetApiError(
            502,
            'O*NET request GET /online/search failed with HTTP 502',
            '/online/search',
            'Traceback at /srv/internal/app.py host=db-7.corp.local'
          )
        )
      ),
    } as unknown as OnetClient;
    render(<OccupationSearch client={client} />);
    await userEvent.type(screen.getByRole('searchbox'), 'nurse');
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'The occupation search failed (HTTP 502). Please try again.'
    );
    expect(alert.textContent).not.toContain('corp.local');
  });
});
