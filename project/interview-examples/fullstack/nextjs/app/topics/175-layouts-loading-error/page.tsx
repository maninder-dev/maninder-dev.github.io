// Topic 175: overview page inside the nested layout.
// Run: npm run ex 175        (open: /topics/175-layouts-loading-error)
export default function Page() {
  return (
    <>
      <h2>Overview</h2>
      <p>Click the layout counter, then open Settings: the count is kept (layouts persist across navigation).</p>
      <p>Special files: <code>layout.tsx</code> (shell), <code>loading.tsx</code> (instant fallback, wraps the page
        in Suspense), <code>error.tsx</code> (Client Component error boundary with <code>reset</code>),
        <code> not-found.tsx</code> (rendered by <code>notFound()</code>).</p>
    </>
  );
}
