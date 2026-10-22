// Topics 129-131: What is React, the Virtual DOM, JSX  (Full-Stack Handbook, Part 7)
// Run: npm run ex 129
// What it shows: UI = f(state) with a declarative Counter, and that JSX is just a call that
// returns a plain object (the "virtual DOM" element) which React diffs before touching the DOM.
import { createElement, useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p data-testid="count" style={{ color: count > 10 ? 'red' : 'black' }}>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// JSX and the equivalent createElement call produce the same element object
export const viaJsx = (name) => <h1 className="greeting">Hello, {name}!</h1>;
export const viaCreateElement = (name) =>
  createElement('h1', { className: 'greeting' }, 'Hello, ', name, '!');

export function Greeting({ count }) {
  return (
    <div>
      <h1>Hello</h1>
      <p>Count: {count}</p>
    </div>
  );
}
