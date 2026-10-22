import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Lanes } from './154-priority-lanes.jsx';

test('urgent lane renders first even though the transition was queued first', () => {
  const log = [];
  render(<Lanes log={log} />);
  fireEvent.click(screen.getByRole('button'));
  console.log(log);
  expect(log).toEqual([
    'typed="" results="none"', // mount
    'typed="a" results="none"', // Sync lane only
    'typed="a" results="results for a"', // Transition lane
  ]);
});
