import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { ClassCounter, FunctionCounter } from './132-class-vs-function.jsx';

test.each([
  ['class', ClassCounter],
  ['function', FunctionCounter],
])('%s component: mounts, sets title, increments', async (kind, Cmp) => {
  render(<Cmp />);
  expect(document.title).toBe(`Mounted (${kind})`);
  await userEvent.click(screen.getByRole('button'));
  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('2');
});
