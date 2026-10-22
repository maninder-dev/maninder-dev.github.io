import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { FastPage, Measured, SlowPage, renders } from './159-optimize-slow-app.jsx';

beforeEach(() => { renders.expensive = 0; });

function typeFive(Page) {
  const commits = [];
  render(<Measured onCommit={(c) => commits.push(c)}><Page /></Measured>);
  const input = screen.getByLabelText('note');
  for (const v of ['h', 'he', 'hel', 'hell', 'hello']) fireEvent.change(input, { target: { value: v } });
  const total = commits.slice(1).reduce((ms, c) => ms + c.actualDuration, 0);
  console.log(`${Page.name}: ${commits.length} commits, ${total.toFixed(1)} ms on updates, expensive renders ${renders.expensive}`);
  return commits;
}

test('measure: the Profiler records a commit per keystroke', () => {
  const commits = typeFive(SlowPage);
  expect(commits.map((c) => c.phase)).toEqual(['mount', 'update', 'update', 'update', 'update', 'update']);
  expect(renders.expensive).toBe(6); // re-rendered on every keystroke
});

test('fix: moving state down keeps the expensive tree out of the update', () => {
  typeFive(FastPage);
  expect(renders.expensive).toBe(1);
  expect(screen.getByLabelText('note')).toHaveValue('hello');
});
