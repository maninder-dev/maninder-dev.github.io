import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { EditableList } from './136-list-keys.jsx';

async function typeIntoMilkThenInsert(props) {
  render(<EditableList {...props} />);
  await userEvent.type(screen.getByPlaceholderText('Milk'), '2 litres');
  await userEvent.click(screen.getByRole('button', { name: 'Add at top' }));
  return screen.getAllByRole('textbox');
}

test('BUG with index keys: the typed text moves to the newly inserted row', async () => {
  const [first, second] = await typeIntoMilkThenInsert({ useIndexKey: true });
  // React matched by index: row 0 kept its DOM input (with "2 litres") but got the new placeholder
  expect(first.placeholder).toMatch(/^Item/);
  expect(first).toHaveValue('2 litres');
  expect(second.placeholder).toBe('Milk');
  expect(second).toHaveValue('');
});

test('FIX with stable ids: the text stays with Milk', async () => {
  const [first, second] = await typeIntoMilkThenInsert({ useIndexKey: false });
  expect(first.placeholder).toMatch(/^Item/);
  expect(first).toHaveValue('');
  expect(second.placeholder).toBe('Milk');
  expect(second).toHaveValue('2 litres');
});
