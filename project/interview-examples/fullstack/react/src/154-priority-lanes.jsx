// Topic 154: Concurrent Rendering and Priority Lanes  (Full-Stack Handbook, Part 8)
// Run: npm run ex 154
// What it shows: a transition update queued BEFORE an urgent one is still rendered AFTER it.
// React puts them in different lanes and processes the urgent (Sync) lane first, then the
// Transition lane in a separate render. Real interruption needs a browser scheduler; this shows
// the ordering that makes it possible.
import { startTransition, useState } from 'react';

export function Lanes({ log }) {
  const [results, setResults] = useState('none');
  const [typed, setTyped] = useState('');
  log.push(`typed="${typed}" results="${results}"`);

  const onKey = () => {
    startTransition(() => setResults('results for a')); // low priority, queued first
    setTyped('a'); // urgent, queued second
  };
  return <button onClick={onKey}>type a</button>;
}
