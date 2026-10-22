import { useState } from 'react';
import { api, imageUrl, toFormData } from '../api';
import { useAuth } from '../context/AuthContext';
import ImagePicker from '../components/ImagePicker';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name, email: user.email, password: '',
    rollNo: user.rollNo || '', course: user.course || '', phone: user.phone || '',
  });
  const [avatar, setAvatar] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const saved = await api.put('/auth/me', toFormData(form, avatar, 'avatar'));
      setUser(saved);
      setForm((f) => ({ ...f, password: '' }));
      setMessage({ type: 'success', text: 'Profile updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-head">
        <h2>My Profile</h2>
        <span className={`badge ${user.role}`}>{user.role}</span>
      </div>
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="field">
            <label>Full name</label>
            <input value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
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
        <div className="row">
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>New password (leave blank to keep)</label>
            <input type="password" minLength={6} value={form.password} onChange={set('password')} />
          </div>
        </div>
        <ImagePicker label="Profile photo" current={imageUrl(user.avatar)} onChange={setAvatar} />
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Profile'}</button>
      </form>
    </div>
  );
}
