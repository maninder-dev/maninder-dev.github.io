// Topic 220: React Questions  (Full-Stack Handbook, Part 11)
// Run: npm run ex 220
// What it shows: answers not already covered elsewhere: an infinite re-render loop and its guard,
// a useLayoutEffect tooltip positioned before paint, and React 19's useActionState + useOptimistic.
// (Keys: 136. Re-render triggers: 155-156. Controlled inputs: 137. Shared state: 146, 163-165.)
import { useActionState, useEffect, useLayoutEffect, useOptimistic, useRef, useState } from 'react';

// Q. What causes an infinite re-render loop?
export function Bad() {
  const [n, setN] = useState(0);
  setN(n + 1); // state update during render -> render -> update -> ...
  return <p>{n}</p>;
}

export function FiltersFixed({ page, onEffect }) {
  const [filters, setFilters] = useState({ page: 1, q: '' });
  useEffect(() => {
    onEffect();
    if (filters.page !== page) setFilters((f) => ({ ...f, page })); // guard: only when different
  }, [page, filters.page, onEffect]); // primitives, not the object
  return <p>page {filters.page}</p>;
}

// Q. useEffect vs useLayoutEffect? Measure and position before the browser paints.
// jsdom never paints, so the test can only check the measured position; in a browser the
// useEffect version would flash at top 0 for a frame, the layout version never does.
export function Tooltip({ anchorRect, children }) {
  const ref = useRef(null);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const h = ref.current.getBoundingClientRect().height;
    setTop(anchorRect.top - h - 8); // re-render happens synchronously, before paint
  }, [anchorRect]);
  return <div role="tooltip" ref={ref} style={{ position: 'fixed', top }}>{children}</div>;
}

// Q. What's new in React 19? Actions with useActionState, optimistic UI with useOptimistic.
export function AddComment({ saveComment }) {
  const [comments, setComments] = useState([]);
  const [optimistic, addOptimistic] = useOptimistic(comments, (list, text) => [...list, `${text} (sending)`]);
  const [error, submit, isPending] = useActionState(async (prev, formData) => {
    const text = formData.get('text');
    addOptimistic(text); // shown immediately, rolled back automatically if we don't commit it
    const res = await saveComment(text);
    if (!res.ok) return 'Could not post your comment. Try again.';
    setComments((c) => [...c, text]);
    return null;
  }, null);
  return (
    <form action={submit}>
      <textarea name="text" aria-label="comment" />
      <button disabled={isPending}>{isPending ? 'Posting...' : 'Post comment'}</button>
      {error && <p role="alert">{error}</p>}
      <ul>{optimistic.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </form>
  );
}
