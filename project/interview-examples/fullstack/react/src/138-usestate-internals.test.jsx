import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { Profile, makeInitCounter, readHookSlots } from './138-usestate-internals.jsx';

test('hook state lives in an ordered list on the fiber', async () => {
  render(<Profile />);
  const btn = screen.getByRole('button');
  expect(readHookSlots(btn)).toEqual([0, 'Alice']);
  await userEvent.click(btn);
  expect(readHookSlots(btn)).toEqual([1, 'Alice']);
});

test('lazy initial state runs once; eager runs every render', async () => {
  const { Saved, calls } = makeInitCounter();
  render(<Saved />);
  for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button'));
  console.log('initialiser calls after 4 renders:', calls);
  expect(calls).toEqual({ eager: 4, lazy: 1 });
});
