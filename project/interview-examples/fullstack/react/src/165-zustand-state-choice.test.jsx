import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { CartBadge, Controls, WholeStoreBadge, renders, useCart } from './165-zustand-state-choice.jsx';

beforeEach(() => {
  useCart.setState({ items: [], coupon: '' });
  renders.badge = 0;
  renders.whole = 0;
});

test('selectors limit re-renders to the slice a component reads', () => {
  render(<><CartBadge /><WholeStoreBadge /><Controls /></>);
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply coupon' })); // unrelated to count
  fireEvent.click(screen.getByRole('button', { name: 'Apply coupon' })); // same value again
  console.log('renders:', renders);
  expect(screen.getByTestId('badge')).toHaveTextContent('1');
  // whole-store re-rendered for both coupon sets: set() always makes a new state object,
  // so a no-selector subscriber re-renders even when nothing it shows changed
  expect(renders).toEqual({ badge: 2, whole: 4 });
});

test('the store works outside React too (no provider)', () => {
  render(<CartBadge />);
  act(() => useCart.getState().add({ id: 1, name: 'Pen' }));
  expect(screen.getByTestId('badge')).toHaveTextContent('1');
  expect(useCart.getState().items[0].name).toBe('Pen');
});
