import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';
import { ClientClock, Clock, LikeButton } from './167-ssr-hydration.jsx';

// We call hydrateRoot ourselves (not via RTL's render), so tell React this is an act() environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ''; });

// "Server": render HTML at one moment; "browser": hydrate it a second later
async function serverThenHydrate(Comp) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  const container = document.createElement('div');
  container.innerHTML = renderToString(<Comp />);
  document.body.appendChild(container);
  const serverHtml = container.innerHTML;
  const serverNode = container.firstChild;

  vi.setSystemTime(new Date('2026-01-01T10:00:01Z'));
  const recoverable = [];
  const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => {
    root = hydrateRoot(container, <Comp />, { onRecoverableError: (e) => recoverable.push(e.message) });
  });
  return { container, serverHtml, serverNode, recoverable, consoleErr };
}

test('hydration reuses server HTML and attaches handlers', async () => {
  const { container, serverHtml, serverNode, recoverable } = await serverThenHydrate(LikeButton);
  expect(serverHtml).toBe('<button>Likes <!-- -->0</button>');
  expect(container.firstChild).toBe(serverNode); // same DOM node: not rebuilt
  act(() => fireEvent.click(container.querySelector('button')));
  expect(container.textContent).toBe('Likes 1'); // handler is live
  expect(recoverable).toEqual([]);
});

test('BUG: time rendered during render -> hydration mismatch reported', async () => {
  const { container, recoverable } = await serverThenHydrate(Clock);
  console.log('recoverable error:', recoverable[0]?.split('\n')[0]);
  expect(recoverable[0]).toMatch(/Hydration failed|didn't match/);
  expect(container.textContent).toContain('10:00:01'); // React threw away server HTML, re-rendered on the client
});

test('FIX: client-only value set after mount -> no mismatch', async () => {
  const { container, recoverable, consoleErr } = await serverThenHydrate(ClientClock);
  expect(recoverable).toEqual([]);
  expect(consoleErr).not.toHaveBeenCalled();
  expect(container.textContent).toBe('Time: 2026-01-01T10:00:01.000Z');
});
