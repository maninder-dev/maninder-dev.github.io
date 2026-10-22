// Topic 141: The Dependency Array Rules  (Full-Stack Handbook, Part 7)
// Run: npm run ex 141
// What it shows: an interval created with [] deps captures count = 0 forever (stale closure),
// so the counter sticks at 1; the functional update needs no dependency and keeps counting.
// Also: an object dependency recreated each render re-runs the effect; a primitive does not.
import { useEffect, useState } from 'react';

export function Ticker({ variant }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (variant === 'stale') setCount(count + 1); // `count` is always 0 here
      else setCount((c) => c + 1); // reads the latest value from React
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // count deliberately missing
  return <p data-testid="ticks">{count}</p>;
}

export function UserLoader({ id, depOnObject, onFetch }) {
  const [, force] = useState(0);
  const user = { id }; // new object every render
  useEffect(() => { onFetch(user.id); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    depOnObject ? [user] : [user.id]);
  return <button onClick={() => force((n) => n + 1)}>re-render</button>;
}
