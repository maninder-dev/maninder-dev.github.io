// Topic 162: Redux Core Concepts  (Full-Stack Handbook, Part 8)
// Run: npm run ex 162
// What it shows: a 20-line createStore (state + dispatch + subscribe) and a tiny useStore hook built
// on React's useSyncExternalStore, to show there is no magic in Redux or react-redux.
import { useSyncExternalStore } from 'react';

export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action); // the only way state changes
      listeners.forEach((l) => l());
      return action;
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export const counterReducer = (s = 0, a) => (a.type === 'INCREMENT' ? s + a.payload : s);

// What react-redux's useSelector does at its core
export function useStore(store, selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function CounterView({ store }) {
  const value = useStore(store, (s) => s);
  return (
    <button onClick={() => store.dispatch({ type: 'INCREMENT', payload: 1 })}>count {value}</button>
  );
}
