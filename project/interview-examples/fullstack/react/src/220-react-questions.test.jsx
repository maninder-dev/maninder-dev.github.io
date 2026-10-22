import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AddComment, Bad, FiltersFixed, Tooltip } from './220-react-questions.jsx';

test('setState during render -> React stops it with "Too many re-renders"', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the thrown error
  expect(() => render(<Bad />)).toThrow(/Too many re-renders/);
});

test('guarded effect with primitive deps settles instead of looping', () => {
  const onEffect = vi.fn();
  const { rerender } = render(<FiltersFixed page={1} onEffect={onEffect} />);
  rerender(<FiltersFixed page={3} onEffect={onEffect} />);
  expect(screen.getByText('page 3')).toBeInTheDocument();
  expect(onEffect).toHaveBeenCalledTimes(3); // mount, page change, filters.page change, then stops
});

test('useLayoutEffect measures the node and positions the tooltip', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 40 });
  render(<Tooltip anchorRect={{ top: 200 }}>Hi</Tooltip>);
  // measured height 40 -> 200 - 40 - 8, set synchronously in the same commit
  expect(screen.getByRole('tooltip')).toHaveStyle({ top: '152px' });
});

test('useActionState + useOptimistic: instant item, pending state, then committed', async () => {
  let finish;
  const saveComment = vi.fn(() => new Promise((r) => { finish = r; }));
  render(<AddComment saveComment={saveComment} />);
  fireEvent.change(screen.getByLabelText('comment'), { target: { value: 'Nice post' } });
  await act(async () => fireEvent.click(screen.getByRole('button')));
  expect(screen.getByRole('button')).toHaveTextContent('Posting...');
  expect(screen.getByRole('listitem')).toHaveTextContent('Nice post (sending)'); // optimistic
  await act(async () => finish({ ok: true }));
  expect(screen.getByRole('listitem')).toHaveTextContent(/^Nice post$/);
  expect(screen.getByRole('button')).toHaveTextContent('Post comment');
});

test('failed action: optimistic item rolls back, error returned as state', async () => {
  render(<AddComment saveComment={async () => ({ ok: false })} />);
  fireEvent.change(screen.getByLabelText('comment'), { target: { value: 'Hello' } });
  await act(async () => fireEvent.click(screen.getByRole('button')));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not post your comment');
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});
