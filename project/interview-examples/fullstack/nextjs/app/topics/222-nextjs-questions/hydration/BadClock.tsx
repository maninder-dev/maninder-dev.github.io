'use client';
// Topic 222 (the bug): the value differs between the server render and the first client render.
export default function BadClock() {
  return <p data-k="bad-clock">{new Date().toISOString()}</p>;
}
