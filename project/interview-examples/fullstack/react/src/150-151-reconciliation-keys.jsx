// Topics 150-151: Reconciliation, the diffing algorithm, why keys matter  (Full-Stack Handbook, Part 8)
// Run: npm run ex 150
// What it shows: changing the wrapper element type (div -> section) destroys the subtree and its
// state; changing `key` resets state on purpose; and with keys, inserting an item reuses the
// existing DOM nodes (1 insert) instead of rewriting rows by index.
import { useState } from 'react';

export function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>clicks {n}</button>;
}

export function Wrapper({ isAdmin }) {
  // Same Counter, but its parent element type changes -> React unmounts and remounts it
  return isAdmin ? <div><Counter /></div> : <section><Counter /></section>;
}

export function SameTypeWrapper({ isAdmin }) {
  // Same type at the same position: React keeps the instance and its state
  return <div className={isAdmin ? 'admin' : 'user'}><Counter /></div>;
}

export function ProfileForm({ userId }) {
  const [draft, setDraft] = useState('');
  return <input aria-label={`bio-${userId}`} value={draft} onChange={(e) => setDraft(e.target.value)} />;
}

// Keyed vs index list for the DOM-operation comparison
export function Letters({ items, keyed }) {
  return <ul>{items.map((x, i) => <li key={keyed ? x : i}>{x}</li>)}</ul>;
}
