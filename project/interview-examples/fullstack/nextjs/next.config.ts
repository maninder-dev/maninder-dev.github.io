// Next.js config for the handbook examples (topics 171-190, 222).
// turbopack.root pins the project root so a lockfile in a parent folder is not picked up.
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
