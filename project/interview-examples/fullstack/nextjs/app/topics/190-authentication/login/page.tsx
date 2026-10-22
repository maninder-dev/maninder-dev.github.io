// Topic 190: login form. A plain HTML form posting to the route handler, so it works without JS.
// Run: npm run ex 190        (open: /topics/190-authentication/login)
export default async function Login({ searchParams }: { searchParams: Promise<{ from?: string; error?: string }> }) {
  const { from = '/topics/190-authentication', error } = await searchParams;
  return (
    <main>
      <h1>Log in</h1>
      {error && <p className="error">Wrong username or password.</p>}
      <form action="/api/auth/login" method="post">
        <input type="hidden" name="from" value={from} />
        <p><label>Username <input name="username" defaultValue="alice" /></label></p>
        <p><label>Password <input name="password" type="password" /></label></p>
        <button type="submit">Log in</button>
      </form>
      <p>Demo users: alice / alice123 (admin), bob / bob123 (user).</p>
    </main>
  );
}
