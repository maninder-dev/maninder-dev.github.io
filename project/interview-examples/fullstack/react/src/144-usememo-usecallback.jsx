// Topic 144: useMemo and useCallback  (Full-Stack Handbook, Part 7)
// Run: npm run ex 144
// What it shows: toggling an unrelated `theme` state re-renders a React.memo child anyway when
// the parent passes a fresh array/function each time; useMemo + useCallback keep the references
// stable, so the memo child is skipped and the filter does not re-run.
import { memo, useCallback, useMemo, useState } from 'react';

export const stats = { listRenders: 0, filterRuns: 0 };

export const ProductList = memo(function ProductList({ items, onSelect }) {
  stats.listRenders++;
  return (
    <ul>
      {items.map((p) => (
        <li key={p.id}><button onClick={() => onSelect(p.id)}>{p.name}</button></li>
      ))}
    </ul>
  );
});

function filterProducts(products, query) {
  stats.filterRuns++;
  return products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
}

export function ProductPage({ products, query, optimised, onSelect }) {
  const [theme, setTheme] = useState('light');

  // Optimised: same array and function reference until products/query change
  const memoVisible = useMemo(() => (optimised ? filterProducts(products, query) : null), [optimised, products, query]);
  const memoSelect = useCallback((id) => onSelect(id), [onSelect]);

  const visible = optimised ? memoVisible : filterProducts(products, query); // new array each render
  const handleSelect = optimised ? memoSelect : (id) => onSelect(id); // new function each render

  return (
    <div className={theme}>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle theme</button>
      <ProductList items={visible} onSelect={handleSelect} />
    </div>
  );
}
