// Topic 148: Custom Hooks  (Full-Stack Handbook, Part 7)
// Run: npm run ex 148
// What it shows: useFetch and useDebounce share stateful logic; each component calling a hook
// gets its own copy of the state (two counters using useCounter are independent).
import { useEffect, useState } from 'react';

export function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error });
      });
    return () => ctrl.abort();
  }, [url]);
  return state;
}

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t); // a new keystroke cancels the pending update
  }, [value, delay]);
  return debounced;
}

export function useCounter() {
  const [n, setN] = useState(0);
  return [n, () => setN((x) => x + 1)];
}

export function CounterButton({ label }) {
  const [n, inc] = useCounter();
  return <button onClick={inc}>{label}: {n}</button>;
}
