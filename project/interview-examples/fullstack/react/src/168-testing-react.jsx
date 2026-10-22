// Topic 168: Testing React (Jest / Vitest and React Testing Library)  (Full-Stack Handbook, Part 8)
// Run: npm run ex 168
// What it shows: test behaviour like a user (roles, text, clicks), mock fetch for async data,
// and wait with findBy*; Vitest's vi.fn() is the same idea as jest.fn().
import { useEffect, useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </>
  );
}

export function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load users'))))
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p role="alert">{error}</p>;
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
