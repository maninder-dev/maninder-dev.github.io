import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Books() {
  const { isAdmin } = useAuth();
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get(`/books${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        .then(setBooks)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleDelete = async (book) => {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.del(`/books/${book._id}`);
      setBooks((list) => list.filter((b) => b._id !== book._id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>Books Library</h2>
        <div className="actions">
          <input className="search" placeholder="Search title, author, ISBN…" value={q} onChange={(e) => setQ(e.target.value)} />
          {isAdmin && <Link to="/books/new" className="btn btn-primary">+ Add Book</Link>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : books.length === 0 ? (
        <p className="muted">No books found.</p>
      ) : (
        <div className="grid">
          {books.map((b) => (
            <div key={b._id} className="card book-card">
              {b.coverImage ? (
                <img className="cover" src={imageUrl(b.coverImage)} alt={b.title} />
              ) : (
                <div className="cover placeholder">📖</div>
              )}
              <div className="body">
                <h3>{b.title}</h3>
                <span className="muted">by {b.author}</span>
                <span><span className="badge">{b.category}</span> · {b.copies} copies</span>
                <div className="actions">
                  <Link to={`/books/${b._id}`} className="btn btn-sm">View</Link>
                  {isAdmin && (
                    <>
                      <Link to={`/books/${b._id}/edit`} className="btn btn-sm">Edit</Link>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(b)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
