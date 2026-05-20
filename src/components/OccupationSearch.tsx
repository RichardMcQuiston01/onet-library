import { useState } from 'react'
import { useOccupationSearch } from '../hooks/useOccupationSearch'
import type { OnetClient } from '../client/OnetClient'

interface OccupationSearchProps {
  client: OnetClient
}

export function OccupationSearch({ client }: OccupationSearchProps) {
  const [keyword, setKeyword] = useState('')
  const { data, loading, error, search } = useOccupationSearch(client)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      search({ keyword: keyword.trim() })
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search occupations..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !keyword.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <p role="alert">{error.message}</p>}
      {data && (
        <>
          <p>{data.total} result{data.total !== 1 ? 's' : ''}</p>
          <ul>
            {data.occupation.map((occ) => (
              <li key={occ.code}>
                {occ.title} <small>({occ.code})</small>
                {occ.tags.bright_outlook && ' ★'}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
