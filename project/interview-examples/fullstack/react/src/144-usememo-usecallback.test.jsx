import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ProductPage, stats } from './144-usememo-usecallback.jsx';

const products = [
  { id: 1, name: 'Keyboard' },
  { id: 2, name: 'Mouse' },
  { id: 3, name: 'Monitor' },
];
const onSelect = vi.fn();

beforeEach(() => { stats.listRenders = 0; stats.filterRuns = 0; });

function toggleThemeThreeTimes(optimised) {
  render(<ProductPage products={products} query="mo" optimised={optimised} onSelect={onSelect} />);
  const btn = screen.getByRole('button', { name: 'Toggle theme' });
  for (let i = 0; i < 3; i++) fireEvent.click(btn);
  console.log(optimised ? 'optimised' : 'plain', { ...stats });
}

test('without memoization: memo(ProductList) re-renders on every theme toggle', () => {
  toggleThemeThreeTimes(false);
  expect(stats).toEqual({ listRenders: 4, filterRuns: 4 }); // 1 mount + 3 toggles
});

test('with useMemo + useCallback: the list renders once and filters once', () => {
  toggleThemeThreeTimes(true);
  expect(stats).toEqual({ listRenders: 1, filterRuns: 1 });
  expect(screen.getAllByRole('listitem')).toHaveLength(2); // Mouse, Monitor
});

test('changing a real dependency (query) still recomputes', () => {
  const { rerender } = render(<ProductPage products={products} query="mo" optimised onSelect={onSelect} />);
  rerender(<ProductPage products={products} query="key" optimised onSelect={onSelect} />);
  expect(stats).toEqual({ listRenders: 2, filterRuns: 2 });
  fireEvent.click(screen.getByRole('button', { name: 'Keyboard' }));
  expect(onSelect).toHaveBeenCalledWith(1);
});
