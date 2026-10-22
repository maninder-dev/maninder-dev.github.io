// Topic 100: Design: E-Commerce Database Schema  (Full-Stack Handbook, Part 5)
// Run: npm run ex 100      (or: node 100-ecommerce-schema.js)
// What it shows: the handbook's schema created verbatim, seeded with realistic data, then each key
// decision proven: CHECK stops overselling inside a checkout transaction, price_at_purchase keeps
// history when prices change, and the (user_id, created_at DESC) index serves "my orders".
import assert from 'node:assert/strict';
import { createDb, all, one, explain, heading, show, expectPgError } from './lib/db.js';

const db = await createDb();
await db.exec(`
  CREATE TABLE users (
    id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE products (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL,
    description TEXT, base_price NUMERIC(10,2) NOT NULL);
  CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY, product_id INT NOT NULL REFERENCES products(id),
    sku VARCHAR(100) UNIQUE NOT NULL, size VARCHAR(20), color VARCHAR(30),
    price_modifier NUMERIC(10,2) DEFAULT 0,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0));
  CREATE TABLE orders (
    id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE order_items (
    id SERIAL PRIMARY KEY, order_id INT NOT NULL REFERENCES orders(id),
    variant_id INT NOT NULL REFERENCES product_variants(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_purchase NUMERIC(10,2) NOT NULL);
  CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
  CREATE INDEX idx_order_items_order ON order_items(order_id);
  CREATE INDEX idx_variants_product ON product_variants(product_id);

  INSERT INTO users (email, password_hash) SELECT 'user' || g || '@shop.com', 'argon2$...' FROM generate_series(1, 2000) g;
  INSERT INTO products (name, base_price) SELECT 'T-shirt ' || g, 15 + g % 20 FROM generate_series(1, 200) g;
  INSERT INTO product_variants (product_id, sku, size, color, price_modifier, stock)
    SELECT p.id, 'SKU-' || p.id || '-' || s || '-' || c, s, c, CASE s WHEN 'XL' THEN 2 ELSE 0 END, 20
    FROM products p, unnest(ARRAY['S','M','L','XL']) s, unnest(ARRAY['black','white']) c;
  INSERT INTO orders (user_id, status, total_amount, created_at)
    SELECT 1 + g % 200, 'paid', 20, now() - (g % 400) * interval '1 day' FROM generate_series(1, 40000) g; -- 200 orders per active user
  ANALYZE;
`);

async function checkout(userId, items) {
  return db.transaction(async (tx) => {
    let total = 0;
    const lines = [];
    for (const { sku, qty } of items) {
      const v = (await tx.query(`UPDATE product_variants v SET stock = stock - $1 FROM products p
        WHERE v.sku = $2 AND p.id = v.product_id RETURNING v.id, p.base_price + v.price_modifier AS price`, [qty, sku])).rows[0];
      lines.push({ ...v, qty });
      total += Number(v.price) * qty;
    }
    const order = (await tx.query('INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING id', [userId, total])).rows[0];
    for (const l of lines) await tx.query('INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)', [order.id, l.id, l.qty, l.price]);
    return { orderId: order.id, total };
  });
}

heading('Checkout: stock decremented, historical price stored');
const sku = 'SKU-1-XL-black';
const o = await checkout(1, [{ sku, qty: 2 }, { sku: 'SKU-2-M-white', qty: 1 }]);
show('order', o);
assert.equal(o.total, (16 + 2) * 2 + 17);

heading('Never oversell: CHECK (stock >= 0) aborts the whole checkout');
const err = await expectPgError(() => checkout(2, [{ sku: 'SKU-3-S-black', qty: 1 }, { sku, qty: 50 }]), '23514');
show('error', err.message);
const stock = await all(db, `SELECT sku, stock FROM product_variants WHERE sku IN ('SKU-3-S-black', $1) ORDER BY sku`, [sku]);
show('stock after failed checkout (first line rolled back too)', stock);
assert.deepEqual(stock.map((s) => s.stock), [18, 20]);

heading('Price changes do not rewrite history');
await db.query('UPDATE products SET base_price = 99 WHERE id = 1');
const hist = await one(db, `SELECT oi.price_at_purchase, p.base_price + v.price_modifier AS current_price
  FROM order_items oi JOIN product_variants v ON v.id = oi.variant_id JOIN products p ON p.id = v.product_id
  WHERE oi.order_id = $1 AND v.sku = $2`, [o.orderId, sku]);
show('paid vs current', hist);
assert.equal(Number(hist.price_at_purchase), 18);

heading('"My orders" page uses the composite index');
const plan = await explain(db, 'SELECT id, total_amount, created_at FROM orders WHERE user_id = 7 ORDER BY created_at DESC LIMIT 20');
show('plan', plan);
assert.match(plan, /idx_orders_user_created/);
assert.doesNotMatch(plan, /Sort/);

await db.close();
console.log('\nOK');
