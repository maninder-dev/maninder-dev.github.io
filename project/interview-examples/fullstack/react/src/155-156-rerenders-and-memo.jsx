// Topics 155-156: What triggers a re-render, React.memo  (Full-Stack Handbook, Part 8; also 220)
// Run: npm run ex 155
// What it shows: a parent's state change re-renders every child by default; React.memo skips
// children whose props are shallowly equal, but an inline object prop defeats it; a custom
// comparator decides equality yourself; passing children (composition) avoids re-renders for free.
import { memo, useState } from 'react';

export const counts = {};
const hit = (name) => { counts[name] = (counts[name] ?? 0) + 1; };

const Plain = () => { hit('plain'); return null; };
const Memoized = memo(() => { hit('memoized'); return null; });
const MemoWithStyle = memo(function MemoWithStyle({ style }) { hit('memoInlineObject'); return <div style={style} />; });
const Chart = memo(
  function Chart({ data }) { hit('chartCustomCompare'); return <p>v{data.version}</p>; },
  (prev, next) => prev.data.version === next.data.version, // true = "equal, skip render"
);

export function Parent() {
  const [n, setN] = useState(0);
  return (
    <>
      <button onClick={() => setN(n + 1)}>parent {n}</button>
      <Plain />
      <Memoized />
      <MemoWithStyle style={{ color: 'red' }} /> {/* new object every render */}
      <Chart data={{ version: 1, points: [n] }} /> {/* new object, same version */}
    </>
  );
}

// Composition: the state lives in Clicker; `children` were created by App, which did not re-render
function Clicker({ children }) {
  const [n, setN] = useState(0);
  return <div><button onClick={() => setN(n + 1)}>clicker {n}</button>{children}</div>;
}
const Expensive = () => { hit('expensiveAsChildren'); return <p>expensive</p>; };
export const App = () => <Clicker><Expensive /></Clicker>;
