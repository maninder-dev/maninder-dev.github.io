// Topic 221: React Coding Questions - modal with Escape and outside click  (Full-Stack Handbook, Part 11)
// Run: npm run ex 221
// What it shows: the modal renders through a portal into document.body, listens for Escape only
// while open (and removes the listener on close), and stops clicks inside from reaching the backdrop.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="backdrop" data-testid="backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
