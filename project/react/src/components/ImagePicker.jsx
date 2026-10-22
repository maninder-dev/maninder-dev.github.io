import { useEffect, useState } from 'react';

// File input with a live preview; `current` is the already-saved image URL (if any)
export default function ImagePicker({ label, current, onChange }) {
  const [preview, setPreview] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const handleChange = (e) => {
    const file = e.target.files[0] || null;
    setPreview(file ? URL.createObjectURL(file) : '');
    onChange(file);
  };

  const src = preview || current;
  return (
    <div className="field">
      <label>{label}</label>
      <div className="image-picker">
        {src && <img src={src} alt="preview" />}
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleChange} />
      </div>
      <small className="muted">JPG, PNG, GIF or WEBP, max 2 MB</small>
    </div>
  );
}
