import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { BuyButton, FullNameDerived, FullNameWithEffect } from './142-no-effect-needed.jsx';

test('effect-derived state: 2 renders per change, first one shows a stale value', () => {
  const seen = [];
  const { rerender } = render(<FullNameWithEffect first="Ada" last="L" onRender={(v) => seen.push(v)} />);
  rerender(<FullNameWithEffect first="Ada" last="Lovelace" onRender={(v) => seen.push(v)} />);
  console.log('effect version rendered:', seen);
  expect(seen).toEqual(['', 'Ada L', 'Ada L', 'Ada Lovelace']);
});

test('computed during render: 1 render per change, always correct', () => {
  const seen = [];
  const { rerender } = render(<FullNameDerived first="Ada" last="L" onRender={(v) => seen.push(v)} />);
  rerender(<FullNameDerived first="Ada" last="Lovelace" onRender={(v) => seen.push(v)} />);
  expect(seen).toEqual(['Ada L', 'Ada Lovelace']);
});

test('event logic runs in the handler, once per click', () => {
  const addToCart = vi.fn();
  const showToast = vi.fn();
  render(<BuyButton product={{ name: 'Keyboard' }} addToCart={addToCart} showToast={showToast} />);
  fireEvent.click(screen.getByRole('button'));
  expect(showToast).toHaveBeenCalledExactlyOnceWith('Added Keyboard to cart');
});
