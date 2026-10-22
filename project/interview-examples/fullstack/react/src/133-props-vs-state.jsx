// Topic 133: Props vs State, lifting state up  (Full-Stack Handbook, Part 7)
// Run: npm run ex 133
// What it shows: props are read-only inputs, state is owned; two siblings share data by
// lifting the state to their parent and passing a callback down.
import { useState } from 'react';

export function UserCard({ name, age }) {
  const [liked, setLiked] = useState(false); // state owned here
  return (
    <div>
      <h2>{name} ({age})</h2>
      <button onClick={() => setLiked(!liked)}>{liked ? 'Liked' : 'Like'}</button>
    </div>
  );
}

function TemperatureInput({ value, onChange }) {
  return <input aria-label="celsius" value={value} onChange={(e) => onChange(e.target.value)} />;
}
function Verdict({ celsius }) {
  return <p>{Number(celsius) >= 100 ? 'Water boils' : 'Water does not boil'}</p>;
}

// Lifted state: the parent owns `celsius`, both children read it
export function BoilingCalculator() {
  const [celsius, setCelsius] = useState('20');
  return (
    <>
      <TemperatureInput value={celsius} onChange={setCelsius} />
      <Verdict celsius={celsius} />
    </>
  );
}
