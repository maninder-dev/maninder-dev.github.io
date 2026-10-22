// Topic 161: Portals and Refs Forwarding  (Full-Stack Handbook, Part 8)
// Run: npm run ex 161
// What it shows: a portal renders into document.body (outside the parent's DOM) yet React events
// still bubble to the React parent and context still flows in; forwardRef vs React 19's ref-as-prop.
import { createContext, forwardRef, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';

export const ThemeContext = createContext('light');

export function Modal({ children, onClose }) {
  const theme = useContext(ThemeContext); // context crosses the portal
  return createPortal(
    <div className="backdrop" data-testid="backdrop" onClick={onClose}>
      <div className={`modal ${theme}`} role="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Pre-19 style
export const ForwardedInput = forwardRef(function ForwardedInput(props, ref) {
  return <input ref={ref} {...props} />;
});

// React 19: ref is a normal prop on function components
export function PropRefInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

export function FocusDemo() {
  const a = useRef(null);
  const b = useRef(null);
  return (
    <>
      <ForwardedInput aria-label="forwarded" ref={a} />
      <PropRefInput aria-label="ref-prop" ref={b} />
      <button onClick={() => a.current.focus()}>focus forwarded</button>
      <button onClick={() => b.current.focus()}>focus ref-prop</button>
    </>
  );
}
