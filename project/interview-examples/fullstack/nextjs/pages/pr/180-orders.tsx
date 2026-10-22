// Topic 180: getServerSideProps (SSR)  (Full-Stack Handbook, Part 9)
// Run: npm run ex 180        (open: /pr/180-orders, log in at /topics/190-authentication/login first)
// What it shows: runs on every request with access to cookies and query; no session -> redirect
// to the login page; a page number past the end -> notFound (404); otherwise the user's orders.
import type { GetServerSideProps } from 'next';
import { db, type Order } from '@/lib/db';
import { verifySession } from '@/lib/jwt';

type Props = { name: string; page: number; orders: Order[] };

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, query }) => {
  const session = await verifySession(req.cookies.session);
  if (!session) {
    return { redirect: { destination: '/topics/190-authentication/login?from=/pr/180-orders', permanent: false } };
  }
  const page = Number(query.page ?? 1);
  const orders = await db.order.findByUser(session.sub, page);
  if (!orders) return { notFound: true };
  return { props: { name: session.name, page, orders } };
};

export default function Orders({ name, page, orders }: Props) {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>
      <h1>Topic 180: Orders for {name}</h1>
      <p>Page {page}</p>
      <ul>{orders.map((o) => <li key={o.id}>Order #{o.id}: Rs. {o.total} on {o.date}</li>)}</ul>
    </main>
  );
}
