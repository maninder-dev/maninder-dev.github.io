'use client';
// Topic 177: a Client Component that receives server-rendered children (the "donut" pattern).
import { useState } from 'react';

export default function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Show'}: {title}</button>
      {open && children}
    </section>
  );
}
