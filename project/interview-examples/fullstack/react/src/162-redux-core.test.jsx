import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { CounterView, counterReducer, createStore } from './162-redux-core.jsx';

test('dispatch runs the reducer and notifies subscribers', () => {
  const store = createStore(counterReducer, 0);
  const listener = vi.fn(() => store.getState());
  const unsubscribe = store.subscribe(listener);
  store.dispatch({ type: 'INCREMENT', payload: 1 });
  store.dispatch({ type: 'UNKNOWN' }); // reducer returns the same state
  expect(store.getState()).toBe(1);
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  store.dispatch({ type: 'INCREMENT', payload: 5 });
  expect(listener).toHaveBeenCalledTimes(2);
});

test('React components subscribe to the store and re-render on change', () => {
  const store = createStore(counterReducer, 0);
  render(<CounterView store={store} />);
  fireEvent.click(screen.getByRole('button'));
  act(() => { store.dispatch({ type: 'INCREMENT', payload: 10 }); }); // dispatch from outside React
  expect(screen.getByRole('button')).toHaveTextContent('count 11');
});
