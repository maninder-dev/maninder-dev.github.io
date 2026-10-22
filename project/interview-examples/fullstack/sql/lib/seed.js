// Deterministic, realistic seed data built with generate_series (no randomness, so assertions are stable).
export async function seedUsers(db, n = 5000) {
  await db.exec(`
    CREATE TABLE users (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      country    TEXT NOT NULL,
      is_active  BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    INSERT INTO users (email, name, country, is_active, created_at)
    SELECT 'user' || g || '@example.com', 'User ' || g,
           (ARRAY['IN','US','GB','DE','BR'])[1 + g % 5],
           g % 10 <> 0,                                   -- 90% active
           timestamptz '2025-01-01' + (g % 365) * interval '1 day'
    FROM generate_series(1, ${n}) g;
    ANALYZE users;
  `);
}

// orders.user_id deliberately has NO index so examples can show the before/after.
export async function seedOrders(db, { users = 5000, orders = 50000 } = {}) {
  await db.exec(`
    CREATE TABLE orders (
      id         SERIAL PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id),
      status     TEXT NOT NULL,
      total      NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    INSERT INTO orders (user_id, status, total, created_at)
    SELECT 1 + (g * 7919) % ${users},
           (ARRAY['paid','paid','paid','shipped','pending','cancelled'])[1 + g % 6],
           5 + ((g * 37) % 50000) / 100.0,
           timestamptz '2026-01-01' + ((g * 13) % (300 * 24)) * interval '1 hour'
    FROM generate_series(1, ${orders}) g;
    ANALYZE orders;
  `);
}

export async function seedShop(db, opts = {}) {
  await seedUsers(db, opts.users ?? 5000);
  await seedOrders(db, opts);
}
