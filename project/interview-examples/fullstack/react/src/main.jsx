// Live demos for `npm run dev`. The tests (*.test.jsx) are the real examples; this page just lets
// you click through a few of them in a browser.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Counter } from './129-131-react-vdom-jsx.jsx';
import { EditableList } from './136-list-keys.jsx';
import { BatchDemo } from './139-setstate-batching.jsx';
import { Ticker } from './141-dependency-array.jsx';
import { TransitionSearch } from './147-concurrent-hooks.jsx';
import { VirtualContacts } from './158-virtualization.jsx';
import { House } from './170-explain-reconciliation.jsx';
import { Modal } from './221-modal.jsx';
import { Price } from './221-use-previous.jsx';

const items = Array.from({ length: 20_000 }, (_, i) => `item-${i}`);

function Demo({ topic, title, children }) {
  return (
    <section>
      <h2>{topic}: {title}</h2>
      {children}
    </section>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Hello">
        <p>Press Escape or click outside.</p>
      </Modal>
    </>
  );
}

function PriceDemo() {
  const [amount, setAmount] = useState(100);
  return <><Price amount={amount} /> <button onClick={() => setAmount(Math.round(50 + Math.random() * 100))}>New price</button></>;
}

function DoorDemo() {
  const [color, setColor] = useState('red');
  return <><House doorColor={color} /><button onClick={() => setColor(color === 'red' ? 'blue' : 'red')}>Swap door</button></>;
}

function App() {
  return (
    <>
      <h1>React interview demos</h1>
      <p>Run <code>npm test</code> for the assertions; these are the same components, live.</p>
      <Demo topic="129" title="Counter (UI = f(state))"><Counter /></Demo>
      <Demo topic="136" title="Index keys (type in Milk, then add)">
        <EditableList useIndexKey /> <EditableList />
      </Demo>
      <Demo topic="139" title="Batching: stale +1 vs functional +3"><BatchDemo /></Demo>
      <Demo topic="141" title="Stale closure vs functional update">
        stale: <Ticker variant="stale" /> fixed: <Ticker variant="fixed" />
      </Demo>
      <Demo topic="147" title="useTransition over 20,000 items"><TransitionSearch allItems={items} /></Demo>
      <Demo topic="158" title="Virtualized 10,000 rows"><VirtualContacts /></Demo>
      <Demo topic="170" title="Reconciliation: swap only the door"><DoorDemo /></Demo>
      <Demo topic="221" title="Modal and usePrevious"><ModalDemo /> <PriceDemo /></Demo>
    </>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
