import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { AuthProvider, Layout, Navbar, renders } from './146-usecontext.jsx';

beforeEach(() => { renders.navbar = 0; });

test('a deep component reads and updates auth without prop drilling', () => {
  render(<AuthProvider><Layout /></AuthProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(screen.getByRole('button', { name: 'Log out Asha' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log out Asha' }));
  expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
});

test('useAuth outside the provider throws a helpful error', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the uncaught render error
  expect(() => render(<Navbar />)).toThrow('useAuth must be used inside AuthProvider');
});

test('unmemoized value: every provider render re-renders all consumers', () => {
  render(<AuthProvider memoizeValue={false}><Layout /></AuthProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'unrelated update' }));
  fireEvent.click(screen.getByRole('button', { name: 'unrelated update' }));
  expect(renders.navbar).toBe(3);
});

test('useMemo value: unrelated provider renders leave consumers alone', () => {
  render(<AuthProvider><Layout /></AuthProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'unrelated update' }));
  fireEvent.click(screen.getByRole('button', { name: 'unrelated update' }));
  expect(renders.navbar).toBe(1);
});
