import { render, renderHook, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Price, usePrevious } from './221-use-previous.jsx';

test('usePrevious returns the value from the previous render', () => {
  const { result, rerender } = renderHook(({ v }) => usePrevious(v), { initialProps: { v: 1 } });
  expect(result.current).toBeUndefined();
  rerender({ v: 2 });
  expect(result.current).toBe(1);
  rerender({ v: 5 });
  expect(result.current).toBe(2);
});

test('Price shows the trend against the previous amount', () => {
  const { rerender } = render(<Price amount={100} />);
  const price = () => screen.getByTestId('price');
  expect(price()).toHaveTextContent('Rs. 100');
  rerender(<Price amount={120} />);
  expect(price()).toHaveClass('up');
  expect(price()).toHaveTextContent('Rs. 120 (was 100)');
  rerender(<Price amount={90} />);
  expect(price()).toHaveClass('down');
});
