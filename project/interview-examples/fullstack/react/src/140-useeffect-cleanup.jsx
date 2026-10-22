// Topic 140: useEffect - Side Effects and cleanup  (Full-Stack Handbook, Part 7)
// Run: npm run ex 140
// What it shows: an effect that fetches with an AbortController cancels the stale request when
// userId changes, so a slow old response can't overwrite the new one; without cleanup it does.
// Also: StrictMode runs mount -> cleanup -> mount in development to expose missing cleanups.
import { useEffect, useState } from 'react';

export function UserProfile({ userId, withCleanup = true }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users/${userId}`, { signal: withCleanup ? controller.signal : undefined })
      .then((r) => r.json())
      .then(setUser)
      .catch((e) => { if (e.name !== 'AbortError') setError(e); });
    return () => { if (withCleanup) controller.abort(); }; // runs before the next effect and on unmount
  }, [userId, withCleanup]);

  if (error) return <p role="alert">{error.message}</p>;
  return <p data-testid="user">{user ? user.name : 'Loading...'}</p>;
}

export function EffectLogger({ log }) {
  useEffect(() => {
    log.push('mount');
    return () => log.push('cleanup');
  }, [log]);
  return null;
}
