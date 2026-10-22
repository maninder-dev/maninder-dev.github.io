import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { BatchDemo } from './139-setstate-batching.jsx';

const text = (id) => screen.getByTestId(id).textContent;

test('setCount(count + 1) three times adds only 1, and logs the old value', async () => {
  const onLog = vi.fn();
  render(<BatchDemo onLog={onLog} />);
  await userEvent.click(screen.getByRole('button', { name: 'stale +3' }));
  expect(text('count')).toBe('1');
  expect(onLog).toHaveBeenCalledWith(0);
});

test('functional updates queue up: +3, in a single render', async () => {
  render(<BatchDemo />);
  await userEvent.click(screen.getByRole('button', { name: 'functional +3' }));
  expect(text('count')).toBe('3');
  expect(text('renders')).toBe('2'); // initial render + exactly one more
});

test('updates inside a timeout are batched too (automatic batching)', async () => {
  render(<BatchDemo />);
  await userEvent.click(screen.getByRole('button', { name: 'timeout' }));
  await waitFor(() => expect(text('flag')).toBe('true'));
  expect(text('count')).toBe('1');
  expect(text('renders')).toBe('2'); // two setState calls, one render
});
