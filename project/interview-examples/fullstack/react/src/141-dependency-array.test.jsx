import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Ticker, UserLoader } from './141-dependency-array.jsx';

function tick(seconds) {
  for (let i = 0; i < seconds; i++) act(() => vi.advanceTimersByTime(1000));
}

test('stale closure: the interval keeps setting 0 + 1', () => {
  vi.useFakeTimers();
  render(<Ticker variant="stale" />);
  tick(3);
  expect(screen.getByTestId('ticks')).toHaveTextContent('1');
});

test('functional update: no dependency needed, counts correctly', () => {
  vi.useFakeTimers();
  render(<Ticker variant="fixed" />);
  tick(3);
  expect(screen.getByTestId('ticks')).toHaveTextContent('3');
});

test('object dependency re-runs the effect on every render; the primitive does not', () => {
  const onObj = vi.fn();
  const onPrim = vi.fn();
  render(<><UserLoader id={7} depOnObject onFetch={onObj} /><UserLoader id={7} onFetch={onPrim} /></>);
  for (const btn of screen.getAllByRole('button')) { fireEvent.click(btn); fireEvent.click(btn); }
  expect(onObj).toHaveBeenCalledTimes(3); // mount + 2 re-renders
  expect(onPrim).toHaveBeenCalledTimes(1); // mount only
});
