'use client';
// Topic 222 (the fix): render the same placeholder on server and client, set the time after mount.
import { useEffect, useState } from 'react';

export default function GoodClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return <p data-k="good-clock">{time ?? '--:--'}</p>;
}
