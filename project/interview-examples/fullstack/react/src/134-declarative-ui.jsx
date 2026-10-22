// Topic 134: Declarative vs Imperative  (Full-Stack Handbook, Part 7)
// Run: npm run ex 134
// What it shows: the imperative version lists DOM steps; the declarative Status component
// is a pure function of its props, so testing it is just "given props, expect output".

// Imperative: build and update the DOM by hand
export function imperativeCounter(root) {
  let count = 0;
  const btn = document.createElement('button');
  btn.textContent = `Clicked ${count}`;
  btn.addEventListener('click', () => {
    count++;
    btn.textContent = `Clicked ${count}`;
  });
  root.appendChild(btn);
  return () => btn.remove();
}

// Declarative: describe the UI for each state
export function Status({ loading, error, data }) {
  if (loading) return <p role="status">Loading...</p>;
  if (error) return <p role="alert">Could not load orders. Check your connection and try again.</p>;
  return <ul>{data.map((o) => <li key={o.id}>{o.label}</li>)}</ul>;
}
