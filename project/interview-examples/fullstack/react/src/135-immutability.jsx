// Topic 135: Immutability  (Full-Stack Handbook, Part 7)
// Run: npm run ex 135
// What it shows: pushing into the state array and calling setTodos(sameArray) is ignored
// (Object.is says nothing changed); creating a new array re-renders.
import { useState } from 'react';

export function TodoList({ mutate }) {
  const [todos, setTodos] = useState([]);
  const add = () => {
    const todo = { id: todos.length + 1, title: `Task ${todos.length + 1}`, done: false };
    if (mutate) {
      todos.push(todo); // WRONG: same reference
      setTodos(todos);
    } else {
      setTodos([...todos, todo]); // RIGHT: new array
    }
  };
  const toggle = (id) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  return (
    <>
      <button onClick={add}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id} onClick={() => toggle(t.id)}>
            {t.title}
            {t.done ? ' (done)' : ''}
          </li>
        ))}
      </ul>
    </>
  );
}

// Nested update from the PDF: copy every level on the path you change
export const moveUser = (user, city) => ({ ...user, address: { ...user.address, city } });
