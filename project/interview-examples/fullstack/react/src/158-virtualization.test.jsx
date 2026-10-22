import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { NaiveContacts, VirtualContacts, contacts } from './158-virtualization.jsx';

test('naive list: one DOM node per contact', () => {
  const { container } = render(<NaiveContacts />);
  // querySelectorAll, because getAllByRole over 10,000 nodes is itself slow (which is the point)
  expect(container.querySelectorAll('[role=listitem]')).toHaveLength(contacts.length);
});

test('virtualized list: only the visible window is in the DOM', () => {
  const { container } = render(<VirtualContacts />);
  const rows = screen.getAllByRole('listitem');
  console.log(`rendered ${rows.length} of ${contacts.length} rows`);
  expect(rows.length).toBeLessThanOrEqual(600 / 48 + 1 + 2); // 13 visible + overscan
  expect(rows[0]).toHaveTextContent('Contact 0');

  // Scroll to row 5000: rows are recycled, the new window is rendered
  const scroller = container.firstChild;
  act(() => {
    // jsdom does no layout, so give the scroller the numbers a browser would
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 600 });
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: contacts.length * 48 });
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 5000 * 48 });
    fireEvent.scroll(scroller);
  });
  expect(screen.getByText('Contact 5000')).toBeInTheDocument();
  expect(screen.queryByText('Contact 0')).not.toBeInTheDocument();
  expect(screen.getAllByRole('listitem').length).toBeLessThan(20);
});
