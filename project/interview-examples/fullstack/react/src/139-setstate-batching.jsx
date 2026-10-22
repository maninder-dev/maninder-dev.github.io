// Topic 139: setState is Asynchronous and Batched  (Full-Stack Handbook, Part 7)
// Run: npm run ex 139
// What it shows: three setCount(count + 1) calls give +1 (same stale count), three functional
// updates give +3, and all updates in one event (even inside a timeout) cause a single render.
import { useRef, useState } from 'react';

export function BatchDemo({ onLog }) {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  const renders = useRef(0);
  renders.current++;

  const plusThreeStale = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    onLog?.(count); // still the old value: state is a snapshot for this render
  };
  const plusThreeFunctional = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  };
  const twoUpdatesInTimeout = () => {
    setTimeout(() => {
      setCount((c) => c + 1);
      setFlag((f) => !f); // React 18+: batched with the line above -> one render
    }, 0);
  };

  return (
    <>
      <p data-testid="count">{count}</p>
      <p data-testid="renders">{renders.current}</p>
      <p data-testid="flag">{String(flag)}</p>
      <button onClick={plusThreeStale}>stale +3</button>
      <button onClick={plusThreeFunctional}>functional +3</button>
      <button onClick={twoUpdatesInTimeout}>timeout</button>
    </>
  );
}
