import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { Counter, Greeting, viaCreateElement, viaJsx } from './129-131-react-vdom-jsx.jsx';

test('129: the UI is derived from state, no manual DOM updates', async () => {
  render(<Counter />);
  const btn = screen.getByRole('button', { name: 'Increment' });
  for (let i = 0; i < 11; i++) await userEvent.click(btn);
  expect(screen.getByTestId('count')).toHaveTextContent('11');
  expect(screen.getByTestId('count')).toHaveStyle({ color: 'rgb(255, 0, 0)' });
});

test('131: JSX compiles to createElement and yields a plain object', () => {
  const a = viaJsx('Asha');
  const b = viaCreateElement('Asha');
  console.log('JSX element:', JSON.stringify({ type: a.type, props: a.props }));
  expect(a.type).toBe('h1');
  expect(a.props).toEqual(b.props); // { className, children: ['Hello, ', 'Asha', '!'] }
});

test('130: a re-render only patches what changed (same DOM nodes are reused)', () => {
  const { container, rerender } = render(<Greeting count={0} />);
  const h1 = container.querySelector('h1');
  const p = container.querySelector('p');
  rerender(<Greeting count={1} />);
  expect(container.querySelector('h1')).toBe(h1); // untouched
  expect(container.querySelector('p')).toBe(p); // same node, only its text changed
  expect(p).toHaveTextContent('Count: 1');
});
