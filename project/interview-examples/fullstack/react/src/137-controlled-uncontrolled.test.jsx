import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ReadOnlyByAccident, SignupForm } from './137-controlled-uncontrolled.jsx';

test('controlled input is formatted as you type; uncontrolled is read on submit', async () => {
  const onSubmit = vi.fn();
  render(<SignupForm onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText('phone'), '98-765 43abc210');
  expect(screen.getByLabelText('phone')).toHaveValue('9876543210'); // non-digits rejected
  await userEvent.type(screen.getByLabelText('name'), 'Ravi');
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(onSubmit).toHaveBeenCalledWith({ phone: '9876543210', name: 'Ravi' });
});

test('a controlled value wins over what the user types', async () => {
  render(<ReadOnlyByAccident />);
  await userEvent.type(screen.getByLabelText('frozen'), 'xyz');
  expect(screen.getByLabelText('frozen')).toHaveValue('fixed');
});
