// Topic 186: Server Actions  (Full-Stack Handbook, Part 9)
// Run: npm run ex 186        (open: /topics/186-server-actions, log in via topic 190 first)
// What it shows: a todo form posting to a Server Action that checks auth and validates input
// (each action is a public POST endpoint), and a delete action that checks ownership (topic 222).
// The form works with JavaScript disabled; errors come back as ?error=... after a redirect.
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { addTodo, deleteTodo } from './actions';

const messages: Record<string, string> = {
  auth: 'Please log in first (topic 190).',
  title: 'Title must be 3 to 80 characters.',
};

export default async function TodosPage({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const { error, added } = await searchParams;
  const [user, todos] = await Promise.all([getCurrentUser(), db.todo.findMany()]);
  return (
    <main>
      <h1>Topic 186: Server Actions</h1>
      <p>Signed in as: {user ? user.name : 'nobody'}</p>
      {error && <p className="error" data-k="error">{messages[error] ?? 'Unknown error'}</p>}
      {added && <p data-k="added">Added: {added}</p>}
      <form action={addTodo}>
        <input name="title" placeholder="New todo" />
        <button type="submit">Add todo</button>
      </form>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.title}{' '}
            <form action={deleteTodo.bind(null, t.id)} style={{ display: 'inline' }}>
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
