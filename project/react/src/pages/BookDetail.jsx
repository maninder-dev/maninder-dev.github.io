import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useAuth } from '../context/AuthContext';

export default function BookDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/books/${id}`).then(setBook).catch((err) => setError(err.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.del(`/books/${id}`);
      navigate('/books');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!book) return <p className="muted">Loading…</p>;

  return (
    <div className="card">
      <div className="page-head">
        <Link to="/books">← Back to books</Link>
        {isAdmin && (
          <div className="actions">
            <Link to={`/books/${id}/edit`} className="btn">Edit</Link>
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>
      <div className="detail">
        {book.coverImage ? <img src={imageUrl(book.coverImage)} alt={book.title} /> : <div className="cover placeholder" style={{ aspectRatio: '3/4' }}>📖</div>}
        <div>
          <h2>{book.title}</h2>
          <p className="muted">by {book.author}</p>
          <dl>
            <dt>Category</dt><dd>{book.category || '—'}</dd>
            <dt>ISBN</dt><dd>{book.isbn || '—'}</dd>
            <dt>Published</dt><dd>{book.publishedYear || '—'}</dd>
            <dt>Copies</dt><dd>{book.copies}</dd>
          </dl>
          <p>{book.description}</p>
        </div>
      </div>
    </div>
  );
}
