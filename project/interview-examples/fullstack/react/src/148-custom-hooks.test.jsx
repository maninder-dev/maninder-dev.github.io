import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { CounterButton, useDebounce, useFetch } from './148-custom-hooks.jsx';

test('useFetch: loading -> data', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [{ id: 1, name: 'Alice' }] })));
  const { result } = renderHook(() => useFetch('/api/users'));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual([{ id: 1, name: 'Alice' }]);
});

test('useFetch: HTTP error becomes an error state', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
  const { result } = renderHook(() => useFetch('/api/users'));
  await waitFor(() => expect(result.current.error?.message).toBe('Request failed (500)'));
});

test('useDebounce: only the last value after a quiet period gets through', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: '' } });
  for (const v of ['r', 're', 'rea', 'reac']) {
    rerender({ v });
    act(() => vi.advanceTimersByTime(100)); // typing faster than 300 ms
  }
  expect(result.current).toBe(''); // nothing emitted yet
  act(() => vi.advanceTimersByTime(300));
  expect(result.current).toBe('reac');
});

test('a hook shares logic, not state: each caller has its own copy', () => {
  render(<><CounterButton label="A" /><CounterButton label="B" /></>);
  fireEvent.click(screen.getByRole('button', { name: 'A: 0' }));
  expect(screen.getByRole('button', { name: 'A: 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'B: 0' })).toBeInTheDocument();
});
