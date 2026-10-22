// Topic 222: hydration mismatch and its fix.
// Run: npm run ex 222        (open: /topics/222-nextjs-questions/hydration, then ?bad=1 with devtools open)
// What it shows: BadClock renders the time during render, so the server HTML ("10:00:01") differs from
// the browser's first render ("10:00:02") and React reports a hydration error. GoodClock renders a
// placeholder on both sides and fills the time in after mount (useEffect only runs in the browser).
import { connection } from 'next/server';
import BadClock from './BadClock';
import GoodClock from './GoodClock';

export default async function Page({ searchParams }: { searchParams: Promise<{ bad?: string }> }) {
  await connection();
  const { bad } = await searchParams;
  return (
    <main>
      <h1>Hydration mismatch</h1>
      <h2>Fixed clock</h2>
      <GoodClock />
      {bad === '1' ? (
        <><h2>Broken clock (check the browser console)</h2><BadClock /></>
      ) : (
        <p><a href="?bad=1">Show the broken clock</a></p>
      )}
      <p className="note">Other causes: Math.random(), typeof window checks, locale differences, invalid HTML nesting
        (a div inside a p). For values that legitimately differ, <code>suppressHydrationWarning</code> silences one element.</p>
    </main>
  );
}
