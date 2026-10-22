// Topic 147: useLayoutEffect, useId, useTransition, useDeferredValue  (Full-Stack Handbook, Part 7)
// Run: npm run ex 147
// What it shows: useId links label and input uniquely per instance; with useTransition the input
// renders the new text first (urgent) while the heavy list catches up in a second, lower-priority
// render; useDeferredValue gives the same two-step render from a single state value.
// (useLayoutEffect ordering is shown in 152-153, and a measuring tooltip in 220.)
import { memo, useDeferredValue, useId, useState, useTransition } from 'react';

export const BigList = memo(function BigList({ items, filter }) {
  const visible = items.filter((i) => i.includes(filter));
  return <ul aria-label="results">{visible.map((i) => <li key={i}>{i}</li>)}</ul>;
});

export function TransitionSearch({ allItems, log }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  log?.push({ query, filter, isPending });

  const onChange = (e) => {
    setQuery(e.target.value); // urgent: input updates now
    startTransition(() => setFilter(e.target.value)); // non-urgent, can be interrupted
  };
  return (
    <>
      <label htmlFor={id}>Search</label>
      <input id={id} value={query} onChange={onChange} />
      {isPending && <span>Updating...</span>}
      <BigList items={allItems} filter={filter} />
    </>
  );
}

export function DeferredSearch({ allItems, log }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query); // lags behind `query` during urgent renders
  log?.push({ query, deferred });
  return (
    <>
      <label htmlFor={id}>Filter</label>
      <input id={id} value={query} onChange={(e) => setQuery(e.target.value)} />
      <BigList items={allItems} filter={deferred} />
    </>
  );
}
