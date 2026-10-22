// Topic 221: React Coding Questions - usePrevious  (Full-Stack Handbook, Part 11; also 143)
// Run: npm run ex 221
// What it shows: the ref is updated in an effect (after render), so during the next render it
// still holds the previous value; used here to show a price trend.
import { useEffect, useRef } from 'react';

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function Price({ amount }) {
  const prev = usePrevious(amount);
  const trend = prev === undefined ? '' : amount > prev ? 'up' : amount < prev ? 'down' : '';
  return (
    <span data-testid="price" className={trend}>
      Rs. {amount}
      {prev !== undefined && ` (was ${prev})`}
    </span>
  );
}
