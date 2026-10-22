// Topic 172 (CSR): the server sends a shell; a Client Component fetches the data in the browser.
// Run: npm run ex 172        (open: /topics/172-rendering-strategies/csr)
import CsrTime from './CsrTime';

export default function Page() {
  return (
    <main>
      <h1>CSR: client-side rendering</h1>
      <p>The server HTML below has no time in it; useEffect fetches <code>/api/time</code> after hydration.</p>
      <CsrTime />
    </main>
  );
}
