import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { ErrorBoundary, ExportButton, RevenueChart } from './160-error-boundary.jsx';

function Dashboard({ onReport }) {
  const [data, setData] = useState(null); // first render has no data -> throws
  return (
    <>
      <h1>Dashboard</h1>
      <ErrorBoundary onReport={onReport} onReset={() => setData({ total: 4200 })}>
        <RevenueChart data={data} />
      </ErrorBoundary>
    </>
  );
}

test('render error -> fallback, rest of the page survives, reset recovers', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs caught errors in dev
  const onReport = vi.fn();
  render(<Dashboard onReport={onReport} />);
  expect(screen.getByRole('heading')).toHaveTextContent('Dashboard'); // not a blank page
  expect(screen.getByText(/This section failed to load/)).toBeInTheDocument();
  expect(onReport).toHaveBeenCalledWith(expect.objectContaining({ message: 'No revenue data' }), expect.any(String));

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByText('Revenue: 4200')).toBeInTheDocument();
});

test('errors in event handlers bypass the boundary', () => {
  const uncaught = [];
  const onError = (e) => { uncaught.push(e.error.message); e.preventDefault(); };
  window.addEventListener('error', onError);
  vi.spyOn(console, 'error').mockImplementation(() => {}); // jsdom reports the uncaught error
  render(<ErrorBoundary><ExportButton /></ErrorBoundary>);
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  window.removeEventListener('error', onError);
  expect(uncaught).toEqual(['export failed']);
  expect(screen.queryByText(/failed to load/)).not.toBeInTheDocument(); // no fallback
});
