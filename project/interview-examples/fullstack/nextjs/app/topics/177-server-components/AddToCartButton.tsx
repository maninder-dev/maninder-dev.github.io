'use client';
// Topic 177: Client Component (state + event handler). onAdd is a Server Action passed as a prop,
// which is the one kind of function allowed to cross the server -> client boundary.
import { useState, useTransition } from 'react';

export default function AddToCartButton({ id, onAdd }: { id: number; onAdd: (id: number) => Promise<number> }) {
  const [inCart, setInCart] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} onClick={() => startTransition(async () => setInCart(await onAdd(id)))}>
      {inCart === null ? 'Add to cart' : `Added (${inCart} in cart)`}
    </button>
  );
}
