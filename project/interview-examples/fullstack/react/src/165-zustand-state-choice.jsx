// Topic 165: Choosing State Management, Zustand  (Full-Stack Handbook, Part 8; also 220)
// Run: npm run ex 165
// What it shows: a Zustand store needs no provider; a component selecting s.items.length
// re-renders only when the count changes, while one selecting the whole state re-renders on
// every update (even unrelated ones).
import { create } from 'zustand';

export const useCart = create((set) => ({
  items: [],
  coupon: '',
  add: (item) => set((s) => ({ items: [...s.items, item] })),
  setCoupon: (coupon) => set({ coupon }),
}));

export const renders = { badge: 0, whole: 0 };

export function CartBadge() {
  renders.badge++;
  const n = useCart((s) => s.items.length); // narrow selector
  return <span data-testid="badge">{n}</span>;
}

export function WholeStoreBadge() {
  renders.whole++;
  const state = useCart(); // no selector: subscribes to everything
  return <span>{state.items.length}</span>;
}

export function Controls() {
  const add = useCart((s) => s.add); // actions are stable references
  const setCoupon = useCart((s) => s.setCoupon);
  return (
    <>
      <button onClick={() => add({ id: Date.now(), name: 'Mouse' })}>Add</button>
      <button onClick={() => setCoupon('SAVE10')}>Apply coupon</button>
    </>
  );
}
