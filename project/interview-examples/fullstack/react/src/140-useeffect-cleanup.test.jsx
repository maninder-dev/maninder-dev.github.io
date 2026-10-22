import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { expect, test, vi } from 'vitest';
import { EffectLogger, UserProfile } from './140-useeffect-cleanup.jsx';

// A controllable fake fetch: each call waits until the test resolves it, and honours abort.
function installFakeFetch() {
  const pending = {};
  vi.stubGlobal('fetch', vi.fn((url, { signal } = {}) =>
    new Promise((resolve, reject) => {
      const id = url.split('/').pop();
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      pending[id] = (name) => resolve({ json: async () => ({ id, name }) });
    })));
  return pending;
}

async function race(withCleanup) {
  const respond = installFakeFetch();
  const { rerender } = render(<UserProfile userId="1" withCleanup={withCleanup} />);
  rerender(<UserProfile userId="2" withCleanup={withCleanup} />); // user switches profile quickly
  await act(async () => respond['2']('Bob')); // new request answers first
  await act(async () => respond['1']('Alice')); // the old, slow one arrives late
  return screen.getByTestId('user').textContent;
}

test('BUG without cleanup: the late response for user 1 overwrites user 2', async () => {
  expect(await race(false)).toBe('Alice');
});

test('FIX with AbortController: the stale request is cancelled', async () => {
  expect(await race(true)).toBe('Bob');
  const firstSignal = fetch.mock.calls[0][1].signal;
  expect(firstSignal.aborted).toBe(true);
});

test('StrictMode mounts, cleans up and mounts again in development', () => {
  const log = [];
  const { unmount } = render(<StrictMode><EffectLogger log={log} /></StrictMode>);
  expect(log).toEqual(['mount', 'cleanup', 'mount']);
  unmount();
  expect(log.at(-1)).toBe('cleanup');
});
