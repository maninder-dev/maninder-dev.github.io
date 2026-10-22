// Topic 157: Code Splitting with React.lazy and Suspense  (Full-Stack Handbook, Part 8)
// Run: npm run ex 157
// What it shows: a lazy component suspends while its module loads, Suspense shows the fallback,
// then swaps in the real component; the module is only requested when first rendered.
import { lazy, Suspense } from 'react';

export const importer = { calls: 0 };
export const AdminDashboard = lazy(() => {
  importer.calls++;
  return import('./157-admin-dashboard.jsx'); // dynamic import = split point
});

// A lazy component whose loading the test controls, to observe the fallback deterministically
export function makeControlledLazy() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const Comp = lazy(() => promise);
  const finish = () => resolve({ default: () => <h2>Chart editor</h2> });
  return { Comp, finish };
}

export function App({ page, Charts }) {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      {page === 'admin' && <AdminDashboard />}
      {page === 'charts' && <Charts />}
      {page === 'home' && <h2>Home</h2>}
    </Suspense>
  );
}
