import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { BoilingCalculator, UserCard } from './133-props-vs-state.jsx';

test('props come from the parent; state survives a prop change', async () => {
  const { rerender } = render(<UserCard name="Alice" age={25} />);
  await userEvent.click(screen.getByRole('button', { name: 'Like' }));
  rerender(<UserCard name="Alice" age={26} />); // new props, same component instance
  expect(screen.getByRole('heading')).toHaveTextContent('Alice (26)');
  expect(screen.getByRole('button')).toHaveTextContent('Liked'); // state kept
});

test('props are read-only: React freezes the props object in development', () => {
  let captured;
  function Spy(props) { captured = props; return null; }
  render(<Spy name="x" />);
  expect(Object.isFrozen(captured)).toBe(true);
});

test('lifted state keeps sibling components in sync', async () => {
  render(<BoilingCalculator />);
  expect(screen.getByText('Water does not boil')).toBeInTheDocument();
  const input = screen.getByLabelText('celsius');
  await userEvent.clear(input);
  await userEvent.type(input, '100');
  expect(screen.getByText('Water boils')).toBeInTheDocument();
});
