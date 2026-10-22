import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    const t = setTimeout(() => {
      api
        .get(`/users?${params}`)
        .then(setUsers)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, role]);

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    try {
      await api.del(`/users/${u._id}`);
      setUsers((list) => list.filter((x) => x._id !== u._id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>Users</h2>
        <div className="actions">
          <input className="search" placeholder="Search name, email, roll no…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="admin">Admins</option>
          </select>
          <Link to="/users/new" className="btn btn-primary">+ Add User</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <div className="card table-wrap">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th><th>Name</th><th>Email</th><th>Roll no.</th><th>Course</th><th>Role</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><Avatar user={u} /></td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.rollNo || '—'}</td>
                  <td>{u.course || '—'}</td>
                  <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                  <td>
                    <div className="actions">
                      <Link to={`/users/${u._id}/edit`} className="btn btn-sm">Edit</Link>
                      {u._id !== me._id && (
                        <button className="btn-sm btn-danger" onClick={() => handleDelete(u)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="7" className="muted">No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
