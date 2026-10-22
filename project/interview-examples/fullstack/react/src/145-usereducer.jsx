// Topic 145: useReducer  (Full-Stack Handbook, Part 7)
// Run: npm run ex 145
// What it shows: a cart reducer keeps items and total consistent in one place; the reducer is a
// pure function, so it is unit-testable without rendering anything.
import { useReducer } from 'react';

export const initial = { items: [], total: 0 };

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const items = [...state.items, action.item];
      return { items, total: state.total + action.item.price };
    }
    case 'remove': {
      const item = state.items.find((i) => i.id === action.id);
      if (!item) return state;
      return { items: state.items.filter((i) => i.id !== action.id), total: state.total - item.price };
    }
    case 'clear':
      return initial;
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
}

export function Cart() {
  const [cart, dispatch] = useReducer(cartReducer, initial);
  return (
    <>
      <button onClick={() => dispatch({ type: 'add', item: { id: cart.items.length + 1, price: 499 } })}>
        Add to cart ({cart.items.length})
      </button>
      <button onClick={() => dispatch({ type: 'remove', id: 1 })}>Remove first</button>
      <button onClick={() => dispatch({ type: 'clear' })}>Clear</button>
      <p data-testid="total">Rs. {cart.total}</p>
    </>
  );
}
