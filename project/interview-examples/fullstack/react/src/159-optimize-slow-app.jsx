// Topic 159: How to Optimize a Slow React App  (Full-Stack Handbook, Part 8)
// Run: npm run ex 159
// What it shows: "measure first" with the <Profiler> API, then fix with the cheapest tool:
// moving fast-changing state down into a small component stops the expensive sibling re-rendering.
// (Memo, virtualization, code splitting and transitions have their own topics: 144, 156-158, 147.)
import { Profiler, useState } from 'react';

export const renders = { expensive: 0 };

function ExpensiveTree() {
  renders.expensive++;
  let x = 0;
  for (let i = 0; i < 200_000; i++) x += i; // simulate slow work
  return <p>report ready ({x > 0 ? 'ok' : ''})</p>;
}

// BEFORE: typing in the input lives in the same component as the expensive tree
export function SlowPage() {
  const [text, setText] = useState('');
  return (
    <>
      <input aria-label="note" value={text} onChange={(e) => setText(e.target.value)} />
      <ExpensiveTree />
    </>
  );
}

// AFTER: state moved down; the page no longer re-renders on each keystroke
function NoteInput() {
  const [text, setText] = useState('');
  return <input aria-label="note" value={text} onChange={(e) => setText(e.target.value)} />;
}
export function FastPage() {
  return (
    <>
      <NoteInput />
      <ExpensiveTree />
    </>
  );
}

// Measure: Profiler reports each commit with how long the subtree took to render
export function Measured({ children, onCommit }) {
  return (
    <Profiler id="page" onRender={(id, phase, actualDuration) => onCommit({ phase, actualDuration })}>
      {children}
    </Profiler>
  );
}
