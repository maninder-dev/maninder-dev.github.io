// Topic 149: Rules of Hooks  (Full-Stack Handbook, Part 7)
// Run: npm run ex 149
// What it shows: calling useState inside an `if` makes the hook count change between renders,
// and React throws; the fixed version calls hooks unconditionally and puts the condition inside.
import { useEffect, useState } from 'react';

export function BrokenProfile({ isLoggedIn }) {
  const [theme] = useState('light');
  if (isLoggedIn) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [name] = useState('Asha'); // WRONG: only called on some renders
    return <p>{theme} {name}</p>;
  }
  return <p>{theme} guest</p>;
}

export function FixedProfile({ isLoggedIn, loadProfile }) {
  const [theme] = useState('light');
  const [name] = useState('Asha'); // always called, same order every render
  useEffect(() => { if (isLoggedIn) loadProfile(); }, [isLoggedIn, loadProfile]);
  return <p>{theme} {isLoggedIn ? name : 'guest'}</p>;
}
