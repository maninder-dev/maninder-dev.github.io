import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { expect, test, vi } from 'vitest';
import { CartWidget, UserPanel, addItem, fetchUser, makeStore, removeItem } from './163-164-redux-toolkit.jsx';

test('163: slice reducers written with Immer still produce new immutable state', () => {
  const store = makeStore();
  const before = store.getState().cart;
  store.dispatch(addItem({ id: 1, name: 'Keyboard', price: 2499 }));
  const after = store.getState().cart;
  expect(after).not.toBe(before);
  expect(before.items).toHaveLength(0);
  expect(Object.isFrozen(after.items)).toBe(true); // RTK freezes state in development
  store.dispatch(removeItem(1));
  expect(store.getState().cart.items).toEqual([]);
  expect(addItem({ id: 9 })).toEqual({ type: 'cart/addItem', payload: { id: 9 } }); // generated creator
});

test('164: thunk dispatches pending then fulfilled; logger middleware sees both', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 7, name: 'Asha' }) })));
  const log = [];
  const store = makeStore(log);
  const promise = store.dispatch(fetchUser(7));
  expect(store.getState().user.status).toBe('loading');
  await promise;
  expect(store.getState().user).toMatchObject({ status: 'done', data: { name: 'Asha' } });
  console.log(log);
  expect(log.filter((l) => l.startsWith('dispatching'))).toEqual([
    'dispatching user/fetch/pending',
    'dispatching user/fetch/fulfilled',
  ]);
});

test('164: a thrown error becomes the rejected action', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
  const store = makeStore();
  const action = await store.dispatch(fetchUser(1));
  expect(action.type).toBe('user/fetch/rejected');
  expect(store.getState().user).toMatchObject({ status: 'error', error: 'Could not load user' });
});

test('components use useSelector / useDispatch through <Provider>', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 2, name: 'Ravi' }) })));
  render(<Provider store={makeStore()}><CartWidget /><UserPanel id={2} /></Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Add keyboard' }));
  expect(screen.getByTestId('cart')).toHaveTextContent('1 items');
  fireEvent.click(screen.getByRole('button', { name: 'Load user' }));
  expect(screen.getByTestId('status')).toHaveTextContent('loading');
  expect(await screen.findByText('Ravi')).toBeInTheDocument();
});
