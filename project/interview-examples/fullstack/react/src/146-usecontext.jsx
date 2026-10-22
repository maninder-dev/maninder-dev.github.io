// Topic 146: useContext - Avoiding Prop Drilling  (Full-Stack Handbook, Part 7)
// Run: npm run ex 146
// What it shows: an AuthProvider + useAuth hook reach deep components without props; the hook
// throws outside its provider; and memoizing the value stops consumers re-rendering when the
// provider re-renders for unrelated reasons.
import { createContext, memo, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children, memoizeValue = true }) {
  const [user, setUser] = useState(null);
  const [, setUnrelated] = useState(0);
  const memoValue = useMemo(() => ({ user, login: setUser, logout: () => setUser(null) }), [user]);
  const value = memoizeValue ? memoValue : { user, login: setUser, logout: () => setUser(null) };
  return (
    <AuthContext.Provider value={value}>
      <button onClick={() => setUnrelated((n) => n + 1)}>unrelated update</button>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const renders = { navbar: 0 };

// memo so that only context changes (not the parent) can re-render it
export const Navbar = memo(function Navbar() {
  renders.navbar++;
  const { user, login, logout } = useAuth();
  return user
    ? <button onClick={logout}>Log out {user.name}</button>
    : <button onClick={() => login({ name: 'Asha' })}>Log in</button>;
});

// Three levels deep, no props passed through Layout or Sidebar
const Sidebar = () => <aside><Navbar /></aside>;
export const Layout = () => <main><Sidebar /></main>;
