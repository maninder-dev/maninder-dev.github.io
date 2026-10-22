import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Comment, SafePost, UnsafePost, Website, safeHref } from './169-xss.jsx';

const attack = '<img src="x" onerror="alert(1)"><script>alert(2)</script><b>bold</b>';

test('JSX escapes user input: it shows up as text, no elements created', () => {
  render(<Comment text={attack} />);
  const p = screen.getByTestId('comment');
  expect(p.textContent).toBe(attack); // literally the string
  expect(p.querySelector('img, script')).toBeNull();
  expect(p.innerHTML).toContain('&lt;img');
});

test('dangerouslySetInnerHTML without sanitizing creates the attacker elements', () => {
  render(<UnsafePost html={attack} />);
  const img = screen.getByTestId('post').querySelector('img');
  expect(img.getAttribute('onerror')).toBe('alert(1)'); // would run in a browser
});

test('DOMPurify strips scripts and event handlers, keeps safe markup', () => {
  render(<SafePost html={attack} />);
  const post = screen.getByTestId('post');
  console.log('sanitized:', post.innerHTML);
  expect(post.querySelector('script')).toBeNull();
  expect(post.querySelector('img').hasAttribute('onerror')).toBe(false);
  expect(post.querySelector('b')).toHaveTextContent('bold');
});

test('javascript: URLs are rejected before they reach href', () => {
  expect(safeHref('javascript:alert(document.cookie)')).toBe('#');
  expect(safeHref('JaVaScRiPt:alert(1)')).toBe('#');
  expect(safeHref('https://example.com')).toBe('https://example.com');
  render(<Website link="javascript:alert(1)" />);
  expect(screen.getByRole('link')).toHaveAttribute('href', '#');
});
