import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { Status, imperativeCounter } from './134-declarative-ui.jsx';

test('imperative: every change is a manual DOM step', async () => {
  const remove = imperativeCounter(document.body);
  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('Clicked 1');
  remove();
});

test('declarative: UI = f(state), each state maps to one output', () => {
  const { rerender } = render(<Status loading />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  rerender(<Status error={new Error('x')} />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  rerender(<Status data={[{ id: 1, label: 'Order #1' }]} />);
  expect(screen.getByRole('listitem')).toHaveTextContent('Order #1');
});
