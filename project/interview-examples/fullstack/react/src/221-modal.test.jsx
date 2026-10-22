import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { Modal } from './221-modal.jsx';

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <main>
      <button onClick={() => setOpen(true)}>Delete account</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm delete">
        <button>Yes, delete</button>
      </Modal>
    </main>
  );
}

test('opens into document.body via a portal', async () => {
  const { container } = render(<Page />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  const dialog = screen.getByRole('dialog', { name: 'Confirm delete' });
  expect(container.contains(dialog)).toBe(false);
  expect(document.body.contains(dialog)).toBe(true);
});

test('Escape closes it', async () => {
  render(<Page />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('outside click closes it, inside click does not', async () => {
  render(<Page />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await userEvent.click(screen.getByTestId('backdrop'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('the keydown listener is removed when the modal closes', () => {
  const remove = vi.spyOn(document, 'removeEventListener');
  const onClose = vi.fn();
  const { rerender } = render(<Modal open onClose={onClose} title="t" />);
  rerender(<Modal open={false} onClose={onClose} title="t" />);
  expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
});
