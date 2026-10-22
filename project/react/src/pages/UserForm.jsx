import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl, toFormData } from '../api';
import { useAuth } from '../context/AuthContext';
import ImagePicker from '../components/ImagePicker';

const EMPTY = { name: '', email: '', password: '', role: 'student', rollNo: '', course: '', phone: '' };

export default function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user: me, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSelf = isEdit && me._id === id;

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/users/${id}`)
      .then((u) => {
        setForm({ ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, u[k] ?? ''])), password: '' });
        setCurrentAvatar(imageUrl(u.avatar));
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = toFormData(form, avatar, 'avatar');
      const saved = isEdit ? await api.put(`/users/${id}`, data) : await api.post('/users', data);
      if (isSelf) setUser(saved);
      navigate('/users');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-head">
        <h2>{isEdit ? 'Edit User' : 'Add User'}</h2>
        <Link to="/users">Cancel</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="field">
            <label>Full name *</label>
            <input value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>{isEdit ? 'New password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" minLength={6} value={form.password} onChange={set('password')} required={!isEdit} />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={set('role')} disabled={isSelf}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Roll no.</label>
            <input value={form.rollNo} onChange={set('rollNo')} />
          </div>
          <div className="field">
            <label>Course</label>
            <input value={form.course} onChange={set('course')} />
          </div>
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={set('phone')} />
        </div>
        <ImagePicker label="Profile photo" current={currentAvatar} onChange={setAvatar} />
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}</button>
      </form>
    </div>
  );
}
