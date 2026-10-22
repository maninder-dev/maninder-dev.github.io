'use client';
// Topic 222: Client Component because it needs sorting state. It receives plain serializable data.
import { useState } from 'react';
import type { Order } from '@/lib/db';

export default function OrderTable({ orders }: { orders: Order[] }) {
  const [sort, setSort] = useState<'date' | 'total'>('date');
  const rows = [...orders].sort((a, b) => (sort === 'date' ? a.date.localeCompare(b.date) : b.total - a.total));
  return (
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th><button onClick={() => setSort('date')}>Date{sort === 'date' ? ' *' : ''}</button></th>
          <th><button onClick={() => setSort('total')}>Total{sort === 'total' ? ' *' : ''}</button></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => <tr key={o.id}><td>#{o.id}</td><td>{o.date}</td><td>Rs. {o.total}</td></tr>)}
      </tbody>
    </table>
  );
}
