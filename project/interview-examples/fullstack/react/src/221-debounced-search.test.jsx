import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Search } from './221-debounced-search.jsx';

// Keystrokes as change events. (userEvent + Vitest fake timers deadlocks: RTL's async wrapper
// only auto-advances Jest's fake timers, so we drive the input with fireEvent instead.)
function typeChars(input, text) {
  for (const ch of text) fireEvent.change(input, { target: { value: input.value + ch } });
}

// Fake API: each request resolves when the test says so, and rejects if aborted
function fakeApi() {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn((url, { signal }) => new Promise((resolve, reject) => {
    const q = new URL(url, 'http://x').searchParams.get('q');
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    calls.push({ q, signal, reply: (names) => resolve({ json: async () => names.map((name, id) => ({ id, name })) }) });
  })));
  return calls;
}

test('typing fast sends one request for the final query', async () => {
  vi.useFakeTimers();
  const calls = fakeApi();
  render(<Search />);
  typeChars(screen.getByPlaceholderText('Search products'), 'lamp'); // 4 fast keystrokes
  act(() => vi.advanceTimersByTime(300));
  expect(calls.map((c) => c.q)).toEqual(['lamp']);
  await act(async () => calls[0].reply(['Desk lamp']));
  expect(screen.getByRole('listitem')).toHaveTextContent('Desk lamp');
});

test('a slow stale response is aborted and cannot overwrite newer results', async () => {
  vi.useFakeTimers();
  const calls = fakeApi();
  render(<Search />);
  const input = screen.getByPlaceholderText('Search products');
  typeChars(input, 'la');
  act(() => vi.advanceTimersByTime(300)); // request "la" in flight
  typeChars(input, 'mp');
  act(() => vi.advanceTimersByTime(300)); // request "lamp" starts, "la" is aborted

  expect(calls.map((c) => c.q)).toEqual(['la', 'lamp']);
  expect(calls[0].signal.aborted).toBe(true);
  await act(async () => calls[1].reply(['Desk lamp']));
  await act(async () => calls[0].reply(['Lava rock', 'Ladder'])); // too late, ignored
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Desk lamp']);
});
