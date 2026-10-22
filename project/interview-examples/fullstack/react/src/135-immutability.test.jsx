import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { TodoList, moveUser } from './135-immutability.jsx';

test('mutation: React bails out because the reference did not change', async () => {
  render(<TodoList mutate />);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.queryAllByRole('listitem')).toHaveLength(0); // pushed, but no re-render
});

test('new array: React sees a new reference and re-renders', async () => {
  render(<TodoList />);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  await userEvent.click(screen.getByText('Task 1'));
  expect(screen.getByText('Task 1 (done)')).toBeInTheDocument();
});

test('nested spread copies each level that changes and shares the rest', () => {
  const user = { name: 'A', address: { city: 'Delhi', pin: '1' }, tags: ['x'] };
  const next = moveUser(user, 'Mohali');
  expect(next).not.toBe(user);
  expect(next.address).not.toBe(user.address);
  expect(next.tags).toBe(user.tags); // untouched branch is shared
  expect(user.address.city).toBe('Delhi'); // original unchanged
});
