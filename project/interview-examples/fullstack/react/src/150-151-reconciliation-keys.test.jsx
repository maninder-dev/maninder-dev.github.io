import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Letters, ProfileForm, SameTypeWrapper, Wrapper } from './150-151-reconciliation-keys.jsx';

const clickTwice = () => { const b = screen.getByRole('button'); fireEvent.click(b); fireEvent.click(b); };

test('150: different element type -> subtree rebuilt, state lost', () => {
  const { rerender } = render(<Wrapper isAdmin={false} />);
  clickTwice();
  rerender(<Wrapper isAdmin />);
  expect(screen.getByRole('button')).toHaveTextContent('clicks 0');
});

test('150: same type, only attributes change -> state kept', () => {
  const { rerender } = render(<SameTypeWrapper isAdmin={false} />);
  clickTwice();
  rerender(<SameTypeWrapper isAdmin />);
  expect(screen.getByRole('button')).toHaveTextContent('clicks 2');
});

test('150: changing key resets state on purpose', () => {
  const { rerender } = render(<ProfileForm key="u1" userId="u1" />);
  fireEvent.change(screen.getByLabelText('bio-u1'), { target: { value: 'draft for u1' } });
  rerender(<ProfileForm key="u2" userId="u2" />);
  expect(screen.getByLabelText('bio-u2')).toHaveValue('');
});

// Insert D at position 1 and record what React did to the real DOM
function insertD(keyed) {
  const { container, rerender } = render(<Letters items={['A', 'B', 'C']} keyed={keyed} />);
  const before = [...container.querySelectorAll('li')];
  const mo = new MutationObserver(() => {});
  mo.observe(container, { subtree: true, childList: true, characterData: true });
  rerender(<Letters items={['A', 'D', 'B', 'C']} keyed={keyed} />);
  const records = mo.takeRecords();
  mo.disconnect();
  const after = [...container.querySelectorAll('li')];
  const textEdits = records.filter((r) => r.type === 'characterData' || r.target.nodeName === 'LI').length;
  const inserted = records.filter((r) => r.target.nodeName === 'UL' && r.addedNodes.length).length;
  return { before, after, textEdits, inserted };
}

test('151: index keys -> rows B and C are rewritten, then a C is appended', () => {
  const { before, after, textEdits, inserted } = insertD(false);
  console.log('index keys:', { textEdits, inserted });
  expect(after[1]).toBe(before[1]); // the old "B" node...
  expect(after[1]).toHaveTextContent('D'); // ...now says D
  expect(textEdits).toBe(2); // B->D, C->B
  expect(inserted).toBe(1);
});

test('151: stable keys -> 1 insert, existing nodes untouched', () => {
  const { before, after, textEdits, inserted } = insertD(true);
  console.log('stable keys:', { textEdits, inserted });
  expect(after[2]).toBe(before[1]); // B's node moved along with B
  expect(after[3]).toBe(before[2]);
  expect(textEdits).toBe(0);
  expect(inserted).toBe(1);
});
