// Topics 152-153: Fiber architecture, render phase vs commit phase  (Full-Stack Handbook, Part 8)
// Run: npm run ex 152
// What it shows: each element becomes a fiber linked by child / sibling / return, with an
// `alternate` copy for double buffering (read from React internals, for illustration only);
// and the order render -> useLayoutEffect (DOM ready, before paint) -> useEffect.
import { useEffect, useLayoutEffect, useRef } from 'react';

export function getFiber(domNode) {
  const key = Object.keys(domNode).find((k) => k.startsWith('__reactFiber$'));
  return domNode[key];
}

export function List() {
  return (
    <ul>
      <li>A</li>
      <li>B</li>
    </ul>
  );
}

export function PhaseLogger({ log, label }) {
  const ref = useRef(null);
  log.push(`render ${label}`); // render phase: pure, may run more than once
  useLayoutEffect(() => {
    log.push(`layout effect, DOM says "${ref.current.textContent}"`); // commit, before paint
  });
  useEffect(() => {
    log.push('passive effect'); // after paint
  });
  return <p ref={ref}>{label}</p>;
}
