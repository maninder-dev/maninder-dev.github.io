// Topic 177: a server-only module. Importing it from a 'use client' file fails the build
// ("needs server-only"), so the key below can never be bundled for the browser.
import 'server-only';

export const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY ?? 'sk_demo_server_only_7f3a9c';

export function maskedKey() {
  return `${PAYMENT_API_KEY.slice(0, 3)}...${PAYMENT_API_KEY.slice(-4)}`;
}
