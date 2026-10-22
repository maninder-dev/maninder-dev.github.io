import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { BrokenProfile, FixedProfile } from './149-rules-of-hooks.jsx';

test('conditional hook: React throws when the hook count changes', () => {
  // React also logs the error and an "order of Hooks" warning; silence them for this test.
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { rerender } = render(<BrokenProfile isLoggedIn={false} />);
  expect(() => rerender(<BrokenProfile isLoggedIn />)).toThrow(/Rendered more hooks than during the previous render/);
  expect(err).toHaveBeenCalled();
});

test('unconditional hooks: switching the condition is fine', () => {
  const loadProfile = vi.fn();
  const { rerender } = render(<FixedProfile isLoggedIn={false} loadProfile={loadProfile} />);
  expect(screen.getByText('light guest')).toBeInTheDocument();
  rerender(<FixedProfile isLoggedIn loadProfile={loadProfile} />);
  expect(screen.getByText('light Asha')).toBeInTheDocument();
  expect(loadProfile).toHaveBeenCalledOnce();
});
