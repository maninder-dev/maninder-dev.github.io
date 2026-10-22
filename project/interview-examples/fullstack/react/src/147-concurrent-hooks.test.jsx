import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DeferredSearch, TransitionSearch } from './147-concurrent-hooks.jsx';

const allItems = Array.from({ length: 2000 }, (_, i) => `item-${i}`);

test('useId: two instances get distinct ids, labels still resolve', () => {
  render(<><TransitionSearch allItems={[]} /><TransitionSearch allItems={[]} /></>);
  const [a, b] = screen.getAllByLabelText('Search');
  expect(a.id).not.toBe(b.id);
});

test('useTransition: urgent render shows the typed text, the list follows in a second render', () => {
  const log = [];
  render(<TransitionSearch allItems={allItems} log={log} />);
  log.length = 0;
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: '1999' } });
  console.log('renders after one keystroke:', log);
  // 1st render: input already has the new value, list still on the old filter, isPending true
  expect(log[0]).toEqual({ query: '1999', filter: '', isPending: true });
  // last render: transition done
  expect(log.at(-1)).toEqual({ query: '1999', filter: '1999', isPending: false });
  expect(screen.getByLabelText('Search')).toHaveValue('1999');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('useDeferredValue: the expensive child sees the old value first', () => {
  const log = [];
  render(<DeferredSearch allItems={allItems} log={log} />);
  log.length = 0;
  fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'item-5' } });
  expect(log).toEqual([
    { query: 'item-5', deferred: '' }, // urgent: input is responsive
    { query: 'item-5', deferred: 'item-5' }, // background render with the new value
  ]);
  expect(screen.getByLabelText('Filter')).toHaveValue('item-5');
  expect(screen.getAllByRole('listitem').length).toBe(111); // item-5, item-50..59, item-500..599
});
