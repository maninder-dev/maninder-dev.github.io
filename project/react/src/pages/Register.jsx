import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toFormData } from '../api';
import ImagePicker from '../components/ImagePicker';

const EMPTY = { name: '', email: '', password: '', rollNo: '', course: '', phone: '' };

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/books" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(toFormData(form, avatar, 'avatar'));
      navigate('/books', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card auth-card">
      <h2>Student Registration</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full name *</label>
          <input value={form.name} onChange={set('name')} required />
        </div>
        <div className="field">
          <label>Email *</label>
          <input type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="field">
          <label>Password * (min 6)</label>
          <input type="password" minLength={6} value={form.password} onChange={set('password')} required />
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
        <ImagePicker label="Profile photo" onChange={setAvatar} />
        <button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
      <p className="muted">Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}
