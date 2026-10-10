import {useState} from 'react';
import type {FormEvent, ReactElement, ReactNode} from 'react';
import {useOccupationSearch} from '../hooks/useOccupationSearch';
import type {OnetClient} from '../client/OnetClient';
import {OnetApiError} from '../client/errors';
import type {OccupationReference} from '../types';

const DEFAULT_PAGE_SIZE = 20;

/** Props for {@link OccupationSearch}. */
export interface OccupationSearchProps {
  /** Shared `OnetClient` instance. */
  client: OnetClient;
  /**
   * Results requested per page; must be a positive integer, otherwise the
   * default is used.
   * @defaultValue `20`
   */
  pageSize?: number;
  /** Placeholder text for the search box. */
  placeholder?: string;
  /**
   * Called when a result is chosen. When provided, each result's title is
   * rendered as a button instead of plain text.
   */
  onSelect?: (occupation: OccupationReference) => void;
  /**
   * Replaces the default content of each result row (title, code and a ★ for
   * Bright Outlook). `onSelect` still wraps whatever this returns.
   */
  renderOccupation?: (occupation: OccupationReference) => ReactNode;
}

/**
 * Ready-made occupation search: a search box, result count, result list,
 * previous/next paging and an error message. Unstyled, so it inherits the
 * host app's CSS.
 */
export function OccupationSearch({
  client,
  pageSize: requestedPageSize = DEFAULT_PAGE_SIZE,
  placeholder = 'Search occupations...',
  onSelect,
  renderOccupation = defaultRenderOccupation,
}: OccupationSearchProps): ReactElement {
  // A zero, negative or fractional size would produce page bounds the API rejects.
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize >= 1
      ? requestedPageSize
      : DEFAULT_PAGE_SIZE;
  const [keyword, setKeyword] = useState('');
  // The keyword behind the visible results, so paging is unaffected by edits
  // to the input that have not been submitted yet.
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const {data, loading, error, search} = useOccupationSearch(client);
  const trimmedKeyword = keyword.trim();

  const searchPage = (searchKeyword: string, start: number): void => {
    void search({keyword: searchKeyword, start, end: start + pageSize - 1});
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (trimmedKeyword) {
      setSubmittedKeyword(trimmedKeyword);
      searchPage(trimmedKeyword, 1);
    }
  };

  const hasPreviousPage = data !== null && data.start > 1;
  const hasNextPage = data !== null && data.end < data.total;

  return (
    <div>
      <form onSubmit={handleSubmit} role="search">
        <input
          type="search"
          aria-label="Search occupations"
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          placeholder={placeholder}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !trimmedKeyword}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <p role="alert">{describeSearchError(error)}</p>}
      {data && (
        <>
          <p aria-live="polite">
            {data.total} result{data.total === 1 ? '' : 's'}
          </p>
          <ul>
            {data.occupation.map(occupation => (
              <li key={occupation.code}>
                {onSelect ? (
                  <button type="button" onClick={() => onSelect(occupation)}>
                    {renderOccupation(occupation)}
                  </button>
                ) : (
                  renderOccupation(occupation)
                )}
              </li>
            ))}
          </ul>
          {(hasPreviousPage || hasNextPage) && (
            <nav aria-label="Search result pages">
              <button
                type="button"
                disabled={loading || !hasPreviousPage}
                onClick={() =>
                  searchPage(
                    submittedKeyword,
                    Math.max(1, data.start - pageSize)
                  )
                }
              >
                Previous
              </button>
              <span>
                {data.start}–{data.end} of {data.total}
              </span>
              <button
                type="button"
                disabled={loading || !hasNextPage}
                onClick={() => searchPage(submittedKeyword, data.end + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function defaultRenderOccupation(occupation: OccupationReference): ReactNode {
  return (
    <>
      {occupation.title} <small>({occupation.code})</small>
      {occupation.tags.bright_outlook && ' ★'}
    </>
  );
}

/**
 * Fixed, user-safe text for a failed search. The error's own message can carry
 * upstream details (see `OnetApiError.responseBody`), so it is never shown.
 */
function describeSearchError(error: Error): string {
  return error instanceof OnetApiError
    ? `The occupation search failed (HTTP ${error.status}). Please try again.`
    : 'The occupation search failed. Please try again.';
}
