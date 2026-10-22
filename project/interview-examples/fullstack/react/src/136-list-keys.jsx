// Topic 136: Lists and Keys  (Full-Stack Handbook, Part 7; also 151 and 220)
// Run: npm run ex 136
// What it shows: with key={index}, typed text in an uncontrolled input stays at position 0
// when a new item is inserted at the top, so it lands on the wrong row; key={item.id} keeps it.
import { useState } from 'react';

let nextId = 3;

export function EditableList({ useIndexKey }) {
  const [items, setItems] = useState([
    { id: 1, name: 'Milk' },
    { id: 2, name: 'Bread' },
  ]);
  const addTop = () => setItems([{ id: nextId++, name: `Item ${nextId - 1}` }, ...items]);
  return (
    <>
      <button onClick={addTop}>Add at top</button>
      <ul>
        {items.map((item, index) => (
          <li key={useIndexKey ? index : item.id}>
            {/* Uncontrolled: the DOM node keeps whatever the user typed */}
            <input placeholder={item.name} />
          </li>
        ))}
      </ul>
    </>
  );
}
