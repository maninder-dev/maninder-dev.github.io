// Topic 173: Pages Router API route. pages/api/pr/users.ts -> /api/pr/users
// Run: npm run ex 173
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.status(200).json([{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }]);
}
