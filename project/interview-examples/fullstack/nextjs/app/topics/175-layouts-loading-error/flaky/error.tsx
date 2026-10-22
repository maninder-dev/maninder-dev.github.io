'use client';
// Topic 175: error.tsx must be a Client Component. It catches errors thrown while rendering this
// segment. In production the message is replaced by a digest so server details never leak.
// reset() alone re-renders the client boundary; with a Server Component error we also need
// router.refresh() so the server renders the page again.
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="error">
      <p>We couldn&apos;t load the dashboard. (digest: {error.digest ?? 'n/a'})</p>
      <button onClick={() => startTransition(() => { router.refresh(); reset(); })}>Try again</button>
    </div>
  );
}
