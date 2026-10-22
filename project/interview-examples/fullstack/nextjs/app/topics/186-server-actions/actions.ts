'use server';
// Topic 186 (and 222): Server Actions. Anyone can POST to them, so every action re-checks the
// session and validates its input; middleware/proxy is not a security boundary.
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const PAGE = '/topics/186-server-actions';

export async function addTodo(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`${PAGE}?error=auth`);
  const title = String(formData.get('title') ?? '').trim();
  if (title.length < 3 || title.length > 80) redirect(`${PAGE}?error=title`);
  await db.todo.create({ title, ownerId: user.sub });
  revalidatePath(PAGE);
  redirect(`${PAGE}?added=${encodeURIComponent(title)}`);
}

// Topic 222: "check authorization inside every action": only the owner may delete.
export async function deleteTodo(id: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');
  const todo = await db.todo.findUnique(id);
  if (todo?.ownerId !== user.sub) throw new Error('Not allowed');
  await db.todo.delete(id);
  revalidatePath(PAGE);
}
