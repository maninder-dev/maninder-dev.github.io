// Topic 221: React Coding Questions - debounced search with abort  (Full-Stack Handbook, Part 11)
// Run: npm run ex 221
// What it shows: debouncing collapses fast typing into one request, and aborting the previous
// request means a slow, stale response can never overwrite newer results.
import { useEffect, useState } from 'react';
import { useDebounce } from './148-custom-hooks.jsx';

export function Search({ delay = 300 }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const debounced = useDebounce(q, delay);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    return () => ctrl.abort();
  }, [debounced]);

  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" />
      <ul>{results.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
    </>
  );
}
