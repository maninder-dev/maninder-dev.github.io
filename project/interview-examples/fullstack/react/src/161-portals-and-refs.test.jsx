import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { FocusDemo, Modal, ThemeContext } from './161-portals-and-refs.jsx';

test('portal: DOM lives in document.body, React events and context still work', () => {
  const onParentClick = vi.fn();
  const onClose = vi.fn();
  const { container } = render(
    <ThemeContext.Provider value="dark">
      <section onClick={onParentClick}>
        <Modal onClose={onClose}><button>Inside</button></Modal>
      </section>
    </ThemeContext.Provider>,
  );
  const dialog = screen.getByRole('dialog');
  expect(container.contains(dialog)).toBe(false); // not under the React parent in the DOM
  expect(dialog.parentElement.parentElement).toBe(document.body);
  expect(dialog).toHaveClass('dark'); // context crossed the portal

  fireEvent.click(screen.getByTestId('backdrop'));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onParentClick).toHaveBeenCalledOnce(); // bubbled through the React tree, not the DOM tree

  fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
  expect(onClose).toHaveBeenCalledOnce(); // stopPropagation kept the click inside the dialog
});

test('forwardRef and React 19 ref-as-prop both reach the DOM input', () => {
  render(<FocusDemo />);
  fireEvent.click(screen.getByRole('button', { name: 'focus forwarded' }));
  expect(screen.getByLabelText('forwarded')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'focus ref-prop' }));
  expect(screen.getByLabelText('ref-prop')).toHaveFocus();
});
