import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Cart, cartReducer, initial } from './145-usereducer.jsx';

test('the reducer is a pure function: test it without React', () => {
  const s1 = cartReducer(initial, { type: 'add', item: { id: 1, price: 499 } });
  const s2 = cartReducer(s1, { type: 'add', item: { id: 2, price: 1500 } });
  const s3 = cartReducer(s2, { type: 'remove', id: 1 });
  expect(s2.total).toBe(1999);
  expect(s3).toEqual({ items: [{ id: 2, price: 1500 }], total: 1500 });
  expect(initial.items).toHaveLength(0); // never mutated
  expect(() => cartReducer(initial, { type: 'oops' })).toThrow('Unknown action oops');
});

test('the component dispatches actions', () => {
  render(<Cart />);
  const add = screen.getByRole('button', { name: /Add to cart/ });
  fireEvent.click(add);
  fireEvent.click(add);
  expect(add).toHaveTextContent('Add to cart (2)');
  expect(screen.getByTestId('total')).toHaveTextContent('Rs. 998');
  fireEvent.click(screen.getByRole('button', { name: 'Remove first' }));
  expect(screen.getByTestId('total')).toHaveTextContent('Rs. 499');
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByTestId('total')).toHaveTextContent('Rs. 0');
});
