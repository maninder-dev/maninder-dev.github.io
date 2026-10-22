import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { App, Parent, counts } from './155-156-rerenders-and-memo.jsx';

beforeEach(() => { for (const k of Object.keys(counts)) delete counts[k]; });

test('three parent clicks: who re-rendered?', () => {
  render(<Parent />);
  const btn = screen.getByRole('button');
  for (let i = 0; i < 3; i++) fireEvent.click(btn);
  console.log('render counts (1 = mount only):', counts);
  expect(counts).toEqual({
    plain: 4, // re-renders with the parent
    memoized: 1, // no props changed -> skipped
    memoInlineObject: 4, // memo defeated by a new {} each render
    chartCustomCompare: 1, // comparator says version is equal -> skipped
  });
});

test('composition: children passed from above are not re-rendered', () => {
  render(<App />);
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('clicker 3');
  expect(counts.expensiveAsChildren).toBe(1);
});
