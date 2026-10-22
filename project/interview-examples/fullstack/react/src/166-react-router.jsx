// Topic 166: React Router  (Full-Stack Handbook, Part 8)
// Run: npm run ex 166
// What it shows: routes with a :id param, useNavigate, a RequireAuth guard that redirects to
// /login (remembering where you came from), and a catch-all 404. React Router v7 (package
// "react-router"; "react-router-dom" re-exports the same API).
import { createContext, useContext, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <button onClick={() => navigate('/products')}>Back to products ({id})</button>;
}

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from ?? '/';
  return <button onClick={() => { login({ name: 'Asha' }); navigate(from, { replace: true }); }}>Log in</button>;
}

export function AppRoutes() {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, login: setUser }}>
      <nav><Link to="/">Home</Link> <Link to="/products">Products</Link></nav>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/products" element={<h1>Products</h1>} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<RequireAuth><h1>Account of {user?.name}</h1></RequireAuth>} />
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </AuthContext.Provider>
  );
}
