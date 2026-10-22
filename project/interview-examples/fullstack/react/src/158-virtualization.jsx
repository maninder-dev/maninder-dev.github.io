// Topic 158: List Virtualization  (Full-Stack Handbook, Part 8)
// Run: npm run ex 158
// What it shows: react-window renders only the rows inside a 600px viewport (plus overscan) out of
// 10,000, and swaps in different rows when you scroll; the naive list creates all 10,000 nodes.
import { FixedSizeList } from 'react-window';

export const contacts = Array.from({ length: 10_000 }, (_, i) => ({ id: i, name: `Contact ${i}` }));

export function VirtualContacts({ items = contacts }) {
  return (
    <FixedSizeList height={600} width="100%" itemCount={items.length} itemSize={48} overscanCount={2}>
      {({ index, style }) => <div role="listitem" style={style}>{items[index].name}</div>}
    </FixedSizeList>
  );
}

export function NaiveContacts({ items = contacts }) {
  return <div>{items.map((c) => <div role="listitem" key={c.id}>{c.name}</div>)}</div>;
}
