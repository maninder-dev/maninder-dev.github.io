'use client';
// Topic 172 (CSR): runs in the browser, fetches after mount (SWR / React Query in real apps).
import { useEffect, useState } from 'react';

export default function CsrTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/time')
      .then((r) => r.json())
      .then((d: { now: string }) => setTime(d.now));
  }, []);
  return <p>{time ? `Fetched in the browser: ${time}` : 'Loading time in the browser...'}</p>;
}
