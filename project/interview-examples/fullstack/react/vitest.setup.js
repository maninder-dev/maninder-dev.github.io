// Shared test setup: jest-dom matchers, DOM cleanup, and a guard that turns
// any "not wrapped in act(...)" warning into a test failure so none slip by unexplained.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const original = console.error;
console.error = (...args) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('not wrapped in act')) throw new Error('act() warning: ' + msg);
  original(...args);
};
