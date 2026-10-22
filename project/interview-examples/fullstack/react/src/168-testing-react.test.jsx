import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Counter, { UserList } from './168-testing-react.jsx';

test('increments when the button is clicked', async () => {
  const user = userEvent.setup();
  render(<Counter />);
  await user.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('1')).toBeInTheDocument();
});

test('shows users from the API', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1, name: 'Alice' }] }));
  render(<UserList />);
  expect(await screen.findByText('Alice')).toBeInTheDocument(); // findBy waits for the async update
  expect(fetch).toHaveBeenCalledWith('/api/users');
});

test('shows an error when the API fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  render(<UserList />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load users');
});
