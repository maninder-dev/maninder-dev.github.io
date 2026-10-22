// Topic 143: useRef - The Persistent Box  (Full-Stack Handbook, Part 7)
// Run: npm run ex 143
// What it shows: a ref holds the interval id across renders, gives access to a DOM node for
// focus(), and changing ref.current does NOT re-render (unlike state).
import { useRef, useState } from 'react';

export function Stopwatch() {
  const [ms, setMs] = useState(0);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const start = () => {
    if (timerRef.current) return; // already running
    timerRef.current = setInterval(() => setMs((m) => m + 100), 100);
  };
  const stop = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };
  return (
    <>
      <p data-testid="time">{(ms / 1000).toFixed(1)} s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <input aria-label="name" ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus name</button>
    </>
  );
}

export function RefVsState({ onRender }) {
  const clicks = useRef(0);
  const [shown, setShown] = useState(0);
  onRender();
  return (
    <>
      <button onClick={() => { clicks.current++; }}>count silently</button>
      <button onClick={() => setShown(clicks.current)}>show</button>
      <p data-testid="shown">{shown}</p>
    </>
  );
}
