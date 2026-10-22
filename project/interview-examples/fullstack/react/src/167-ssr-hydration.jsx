// Topic 167: SSR and Hydration  (Full-Stack Handbook, Part 8; also 222)
// Run: npm run ex 167
// What it shows: renderToString produces server HTML; hydrateRoot attaches React to it without
// rebuilding. Rendering the current time during render differs between server and client, so
// React reports a hydration mismatch; rendering client-only values after mount fixes it.
import { useEffect, useState } from 'react';

// BUG: the clock is read during render, on the server and again on the client
export function Clock() {
  return <p>Time: {new Date().toISOString()}</p>;
}

// FIX: first client render matches the server (empty), the real value arrives after mount
export function ClientClock() {
  const [time, setTime] = useState(null);
  useEffect(() => setTime(new Date().toISOString()), []);
  return <p>Time: {time ?? ''}</p>;
}

export function LikeButton() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes(likes + 1)}>Likes {likes}</button>;
}
