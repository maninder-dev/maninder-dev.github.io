'use client';
// Topic 175: client state inside a layout. Click it, then navigate with the links: the count
// survives because Next only swaps the {children} slot, the layout stays mounted.
import { useState } from 'react';

export default function LayoutCounter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>Layout counter: {count}</button>;
}
