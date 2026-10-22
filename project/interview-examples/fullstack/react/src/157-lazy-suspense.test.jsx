import { act, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App, importer, makeControlledLazy } from './157-lazy-suspense.jsx';

test('fallback is shown until the chunk resolves', async () => {
  const { Comp, finish } = makeControlledLazy();
  render(<App page="charts" Charts={Comp} />);
  expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  await act(async () => finish());
  expect(screen.getByRole('heading')).toHaveTextContent('Chart editor');
  expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
});

test('the module is imported only when the lazy component first renders', async () => {
  const { rerender } = render(<App page="home" />);
  expect(importer.calls).toBe(0); // not loaded yet
  rerender(<App page="admin" />);
  expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  expect(importer.calls).toBe(1);
});
