import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { House } from './170-explain-reconciliation.jsx';

test('changing the door touches exactly one attribute on one node', () => {
  const { container, rerender } = render(<House doorColor="red" />);
  const nodesBefore = [...container.querySelectorAll('*')];
  const mo = new MutationObserver(() => {});
  mo.observe(container, { subtree: true, childList: true, attributes: true, characterData: true });

  rerender(<House doorColor="blue" />);
  const records = mo.takeRecords();
  mo.disconnect();

  console.log('DOM mutations:', records.map((r) => `${r.type} ${r.attributeName ?? ''} on .${r.target.className}`));
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ type: 'attributes', attributeName: 'class' });
  expect(records[0].target).toHaveClass('door');
  expect([...container.querySelectorAll('*')]).toEqual(nodesBefore); // same nodes, nothing rebuilt
});
