import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl, toFormData } from '../api';
import ImagePicker from '../components/ImagePicker';

const EMPTY = { title: '', author: '', isbn: '', category: 'General', publishedYear: '', copies: 1, description: '' };

export default function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [currentCover, setCurrentCover] = useState('');
  const [cover, setCover] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/books/${id}`)
      .then((b) => {
        setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, b[k] ?? ''])));
        setCurrentCover(imageUrl(b.coverImage));
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = toFormData(form, cover, 'coverImage');
      if (isEdit) await api.put(`/books/${id}`, data);
      else await api.post('/books', data);
      navigate('/books');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-head">
        <h2>{isEdit ? 'Edit Book' : 'Add Book'}</h2>
        <Link to="/books">Cancel</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="field">
            <label>Title *</label>
            <input value={form.title} onChange={set('title')} required />
          </div>
          <div className="field">
            <label>Author *</label>
            <input value={form.author} onChange={set('author')} required />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>ISBN</label>
            <input value={form.isbn} onChange={set('isbn')} />
          </div>
          <div className="field">
            <label>Category</label>
            <input value={form.category} onChange={set('category')} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Published year</label>
            <input type="number" value={form.publishedYear} onChange={set('publishedYear')} />
          </div>
          <div className="field">
            <label>Copies</label>
            <input type="number" min="0" value={form.copies} onChange={set('copies')} />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={set('description')} />
        </div>
        <ImagePicker label="Cover image" current={currentCover} onChange={setCover} />
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Update Book' : 'Create Book'}</button>
      </form>
    </div>
  );
}
