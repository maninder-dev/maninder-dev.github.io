import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, test } from 'vitest';
import { List, PhaseLogger, getFiber } from './152-153-fiber-and-phases.jsx';

test('152: fibers form a linked tree: child, sibling, return', () => {
  const { container, rerender } = render(<List />);
  const [a, b] = container.querySelectorAll('li');
  const ul = container.querySelector('ul');
  const fa = getFiber(a);
  expect(fa.type).toBe('li');
  expect(fa.sibling.stateNode).toBe(b); // stateNode = the real DOM node
  expect(fa.return.stateNode).toBe(ul);
  expect(getFiber(ul).child.stateNode).toBe(a);
  rerender(<List />);
  expect(fa.alternate).toBeTruthy(); // current <-> work-in-progress copies
});

test('153: render phase, then commit (layout effect), then passive effect', () => {
  const log = [];
  render(<PhaseLogger log={log} label="hello" />);
  console.log(log);
  expect(log).toEqual(['render hello', 'layout effect, DOM says "hello"', 'passive effect']);
});

test('153: the render phase may run twice (StrictMode), so it must be pure', () => {
  const log = [];
  render(<StrictMode><PhaseLogger log={log} label="x" /></StrictMode>);
  expect(log.filter((l) => l.startsWith('render')).length).toBe(2);
});
