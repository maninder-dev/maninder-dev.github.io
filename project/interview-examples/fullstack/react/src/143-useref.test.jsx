import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { RefVsState, Stopwatch } from './143-useref.jsx';

test('the interval id survives re-renders in a ref, so Stop can clear it', () => {
  vi.useFakeTimers();
  render(<Stopwatch />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  act(() => vi.advanceTimersByTime(1500));
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  act(() => vi.advanceTimersByTime(5000)); // stopped: nothing more happens
  expect(screen.getByTestId('time')).toHaveTextContent('1.5 s');
});

test('a DOM ref lets you call focus()', () => {
  render(<Stopwatch />);
  fireEvent.click(screen.getByRole('button', { name: 'Focus name' }));
  expect(screen.getByLabelText('name')).toHaveFocus();
});

test('mutating ref.current does not re-render', () => {
  const onRender = vi.fn();
  render(<RefVsState onRender={onRender} />);
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'count silently' }));
  expect(onRender).toHaveBeenCalledTimes(1); // still only the initial render
  fireEvent.click(screen.getByRole('button', { name: 'show' }));
  expect(screen.getByTestId('shown')).toHaveTextContent('5');
  expect(onRender).toHaveBeenCalledTimes(2);
});
