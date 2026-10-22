// Topic 138: useState - How It Works Internally  (Full-Stack Handbook, Part 7)
// Run: npm run ex 138
// What it shows: hooks are stored as a linked list on the component's fiber (slot 0, slot 1...),
// which the test reads directly; and a lazy initialiser runs once while an eager one runs every render.
import { useState } from 'react';

export function Profile() {
  const [count, setCount] = useState(0); // slot 0
  const [name] = useState('Alice'); // slot 1
  return <button onClick={() => setCount(count + 1)}>{name}: {count}</button>;
}

// Walk fiber.memoizedState -> next -> next... (React internals, for illustration only)
export function readHookSlots(domNode) {
  const keys = Object.keys(domNode);
  let fiber = domNode[keys.find((k) => k.startsWith('__reactFiber$'))];
  const props = domNode[keys.find((k) => k.startsWith('__reactProps$'))];
  // Double buffering: the node may point at the old copy; `alternate` is the other tree
  if (fiber.memoizedProps !== props) fiber = fiber.alternate;
  while (fiber && typeof fiber.type !== 'function') fiber = fiber.return; // up to the component
  const slots = [];
  for (let hook = fiber.memoizedState; hook; hook = hook.next) slots.push(hook.memoizedState);
  return slots;
}

export function makeInitCounter() {
  const calls = { eager: 0, lazy: 0 };
  const expensive = (kind) => { calls[kind]++; return []; };
  function Saved() {
    const [, setTick] = useState(0);
    useState(expensive('eager')); // argument evaluated on every render, result ignored after the 1st
    useState(() => expensive('lazy')); // function called only on the first render
    return <button onClick={() => setTick((t) => t + 1)}>re-render</button>;
  }
  return { Saved, calls };
}
