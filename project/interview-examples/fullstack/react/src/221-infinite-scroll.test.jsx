import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Feed } from './221-infinite-scroll.jsx';

// jsdom has no IntersectionObserver; this mock lets the test "scroll the sentinel into view"
function mockIntersectionObserver() {
  const observers = new Set();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb, options) { this.cb = cb; this.options = options; this.targets = []; }
    observe(el) { this.targets.push(el); observers.add(this); }
    disconnect() { observers.delete(this); }
  });
  return {
    get active() { return observers.size; },
    scrollIntoView: () => observers.forEach((o) => o.cb([{ isIntersecting: true, target: o.targets[0] }])),
  };
}

const fetchPage = vi.fn(async (page) =>
  Array.from({ length: 3 }, (_, i) => ({ id: `${page}-${i}`, title: `Post ${page}.${i}` })));

test('loads a page each time the sentinel becomes visible, then stops', async () => {
  const io = mockIntersectionObserver();
  render(<Feed fetchPage={fetchPage} totalPages={2} />);
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  expect(io.active).toBe(1);

  await act(async () => io.scrollIntoView());
  expect(screen.getAllByRole('listitem')).toHaveLength(3);

  await act(async () => io.scrollIntoView());
  expect(screen.getAllByRole('listitem')).toHaveLength(6);
  expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([1, 2]);

  expect(screen.getByText('No more posts')).toBeInTheDocument();
  expect(io.active).toBe(0); // observer disconnected when hasMore became false
});
