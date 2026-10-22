import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <NavLink to="/books" className="brand">📚 Student Library</NavLink>
      {user && <NavLink to="/books">Books</NavLink>}
      {isAdmin && <NavLink to="/users">Users</NavLink>}
      <span className="spacer" />
      {user ? (
        <>
          <NavLink to="/profile" className="who">
            <Avatar user={user} />
            {user.name} <span className={`badge ${user.role}`}>{user.role}</span>
          </NavLink>
          <button className="btn-sm" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </>
      )}
    </nav>
  );
}
