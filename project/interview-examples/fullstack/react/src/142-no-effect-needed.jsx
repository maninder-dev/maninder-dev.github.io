// Topic 142: You Might Not Need an Effect  (Full-Stack Handbook, Part 7)
// Run: npm run ex 142
// What it shows: deriving fullName in an effect costs an extra render and briefly shows a stale
// value; computing it during render is correct on the first pass. Event logic goes in the handler.
import { useEffect, useState } from 'react';

export function FullNameWithEffect({ first, last, onRender }) {
  const [fullName, setFullName] = useState('');
  useEffect(() => setFullName(`${first} ${last}`), [first, last]);
  onRender(fullName);
  return <p>{fullName}</p>;
}

export function FullNameDerived({ first, last, onRender }) {
  const fullName = `${first} ${last}`; // just compute it
  onRender(fullName);
  return <p>{fullName}</p>;
}

// Event logic belongs in the event handler, not in an effect watching `cart`
export function BuyButton({ product, addToCart, showToast }) {
  function handleBuy() {
    addToCart(product);
    showToast(`Added ${product.name} to cart`);
  }
  return <button onClick={handleBuy}>Buy</button>;
}
