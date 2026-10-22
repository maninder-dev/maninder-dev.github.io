// Topics 163-164: Redux Toolkit, middleware and async thunks  (Full-Stack Handbook, Part 8)
// Run: npm run ex 163
// What it shows: createSlice with Immer "mutating" reducers, a logger middleware, and
// createAsyncThunk producing pending -> fulfilled / rejected actions, wired to React via react-redux.
import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) { state.items.push(action.payload); }, // Immer makes this immutable
    removeItem(state, action) { state.items = state.items.filter((i) => i.id !== action.payload); },
  },
});
export const { addItem, removeItem } = cartSlice.actions;

export const fetchUser = createAsyncThunk('user/fetch', async (id) => {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Could not load user');
  return res.json();
});

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => b
    .addCase(fetchUser.pending, (s) => { s.status = 'loading'; })
    .addCase(fetchUser.fulfilled, (s, a) => { s.status = 'done'; s.data = a.payload; })
    .addCase(fetchUser.rejected, (s, a) => { s.status = 'error'; s.error = a.error.message; }),
});

// Middleware: store => next => action
export const makeLogger = (log) => (store) => (next) => (action) => {
  log.push(`dispatching ${action.type}`);
  const result = next(action);
  log.push(`next state cart=${store.getState().cart.items.length} user=${store.getState().user.status}`);
  return result;
};

export function makeStore(log = []) {
  return configureStore({
    reducer: { cart: cartSlice.reducer, user: userSlice.reducer },
    middleware: (getDefault) => getDefault().concat(makeLogger(log)), // thunk is in the defaults
  });
}

export function CartWidget() {
  const items = useSelector((s) => s.cart.items);
  const dispatch = useDispatch();
  return (
    <>
      <button onClick={() => dispatch(addItem({ id: items.length + 1, name: 'Keyboard', price: 2499 }))}>
        Add keyboard
      </button>
      <p data-testid="cart">{items.length} items</p>
    </>
  );
}

export function UserPanel({ id }) {
  const { status, data, error } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  return (
    <>
      <button onClick={() => dispatch(fetchUser(id))}>Load user</button>
      <p data-testid="status">{status}</p>
      {data && <p>{data.name}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
