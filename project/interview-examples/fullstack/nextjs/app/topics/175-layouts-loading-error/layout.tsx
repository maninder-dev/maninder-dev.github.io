// Topic 175: Layouts, Loading UI and Error Handling  (Full-Stack Handbook, Part 9)
// Run: npm run ex 175        (open: /topics/175-layouts-loading-error)
// What it shows: this nested layout wraps every page below it and is NOT re-rendered when you
// navigate between them, so the client counter keeps its state. Children: slow/ (loading.tsx),
// flaky/ (error.tsx with reset), products/[id] (notFound() -> not-found.tsx).
import Link from 'next/link';
import LayoutCounter from './LayoutCounter';

const base = '/topics/175-layouts-loading-error';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <h1>Topic 175: Layouts, loading UI and error handling</h1>
      <aside className="note">
        <p>Nested layout (rendered once at <code data-k="layout-rendered">{new Date().toISOString()}</code>)</p>
        <LayoutCounter />
        <nav className="sub">
          <Link href={base}>Overview</Link>
          <Link href={`${base}/settings`}>Settings</Link>
          <Link href={`${base}/slow`}>Slow (loading.tsx)</Link>
          <Link href={`${base}/flaky`}>Flaky (error.tsx)</Link>
          <Link href={`${base}/products/1`}>Product 1</Link>
          <Link href={`${base}/products/999`}>Product 999 (not found)</Link>
        </nav>
      </aside>
      <section>{children}</section>
    </main>
  );
}
