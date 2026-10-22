// Topic 137: Controlled vs Uncontrolled Inputs  (Full-Stack Handbook, Part 7; also 220)
// Run: npm run ex 137
// What it shows: a controlled input's value lives in state, so it can be reformatted on every
// keystroke; an uncontrolled input keeps its value in the DOM and is read via a ref on submit.
import { useRef, useState } from 'react';

export function SignupForm({ onSubmit }) {
  const [phone, setPhone] = useState(''); // controlled
  const nameRef = useRef(null); // uncontrolled
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ phone, name: nameRef.current.value });
  };
  return (
    <form onSubmit={handleSubmit}>
      <input
        aria-label="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} // digits only
      />
      <input aria-label="name" ref={nameRef} defaultValue="" />
      <button type="submit">Create account</button>
    </form>
  );
}

// Controlled input without onChange: React owns the value, so typing does nothing
export function ReadOnlyByAccident() {
  return <input aria-label="frozen" value="fixed" readOnly />;
}
