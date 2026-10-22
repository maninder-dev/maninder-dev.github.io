# Next.js examples (Full-Stack Handbook topics 171-190, 222)

One Next.js 16 App Router project (TypeScript, React 19). Each topic has its own route; the
Pages Router topics (173, 179-181) live in `pages/pr/`. Data comes from `lib/db.ts`, an in-memory
"database" with artificial delays and call counters, so nothing needs a network or a real database.

```bash
npm install
npm test            # next build, then start the server and check every topic
npm run ex 185      # checks for one topic (builds first if .next is missing)
npm run dev         # browse http://localhost:3000
```

`scripts/check.mjs` starts `next start` on a free port, requests each route with `fetch`, asserts
status codes, redirects, headers and page text, then stops the server.

Notes for Next 16: `middleware.ts` is now called `proxy.ts` (same API, function named `proxy`);
`revalidateTag` takes a second argument (`'max'` or `{ expire: 0 }`) and Server Actions can use
`updateTag`. Fonts use `next/font/local` (with a file from `@fontsource/inter`) instead of
`next/font/google`, so the build works offline. Demo secrets (`JWT_SECRET`, `REVALIDATE_SECRET`,
`PAYMENT_API_KEY`) have built-in fallbacks; set real values through environment variables.
Demo users: `alice / alice123` (admin), `bob / bob123` (user).

| Topic | Title | Route | Files |
|---|---|---|---|
| 171 | What is Next.js and why use it? | `/topics/171-what-is-nextjs`, `/api/health` | `app/topics/171-what-is-nextjs/page.tsx`, `app/api/health/route.ts`, `app/layout.tsx`, `app/page.tsx` |
| 172 | CSR vs SSR vs SSG vs ISR | `/topics/172-rendering-strategies/{static,dynamic,isr,csr}` | `app/topics/172-rendering-strategies/**`, `app/api/time/route.ts` |
| 173 | File-based routing (Pages Router) | `/pr/173/blog/hello-world`, `/pr/173/docs/a/b/c`, `/pr/173/shop/x/y`, `/api/pr/users` | `pages/pr/173/**`, `pages/api/pr/users.ts` |
| 174 | The App Router | `/topics/174-app-router`, `/about` (route group), `/blog/[slug]` | `app/topics/174-app-router/page.tsx`, `(marketing)/about/page.tsx`, `blog/[slug]/page.tsx` |
| 175 | Layouts, loading UI and error handling | `/topics/175-layouts-loading-error/{settings,slow,flaky,products/[id]}` | `app/topics/175-layouts-loading-error/` `layout.tsx`, `LayoutCounter.tsx`, `slow/loading.tsx`, `flaky/error.tsx`, `not-found.tsx`, `products/[id]/page.tsx` |
| 176 | Streaming with Suspense | `/topics/176-streaming-suspense` | `app/topics/176-streaming-suspense/page.tsx` |
| 177 | React Server Components | `/topics/177-server-components` | `app/topics/177-server-components/*`, `lib/secret.ts` |
| 178 | RSC benefits: bundle size | `/topics/178-rsc-bundle-size` | `app/topics/178-rsc-bundle-size/page.tsx` |
| 179 | getStaticProps (SSG + ISR) | `/pr/179-blog` | `pages/pr/179-blog.tsx` |
| 180 | getServerSideProps (SSR) | `/pr/180-orders` | `pages/pr/180-orders.tsx`, `lib/jwt.ts` |
| 181 | getStaticPaths (dynamic SSG) | `/pr/181-products/[id]` | `pages/pr/181-products/[id].tsx` |
| 182 | App Router data fetching | `/topics/182-data-fetching` | `app/topics/182-data-fetching/page.tsx` |
| 183 | Fetch caching behaviour | `/topics/183-fetch-caching` | `app/topics/183-fetch-caching/page.tsx`, `app/api/counter/route.ts` |
| 184 | Caching layers and request memoization | `/topics/184-caching-layers` | `app/topics/184-caching-layers/page.tsx` |
| 185 | On-demand revalidation | `/topics/185-on-demand-revalidation`, `POST /api/revalidate` | `app/topics/185-on-demand-revalidation/{page,actions}.ts(x)`, `app/api/revalidate/route.ts` |
| 186 | Server Actions | `/topics/186-server-actions` | `app/topics/186-server-actions/{page,actions}.ts(x)`, `lib/auth.ts` |
| 187 | Route Handlers | `/api/products`, `/api/products/[id]` | `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, `app/topics/187-route-handlers/page.tsx` |
| 188 | Middleware (proxy.ts) | `/topics/188-middleware/{dashboard,pricing}` | `proxy.ts`, `app/topics/188-middleware/**` |
| 189 | Images, fonts and performance | `/topics/189-images-fonts` | `app/topics/189-images-fonts/*`, `lib/fonts.ts`, `public/hero.png` |
| 190 | Authentication | `/topics/190-authentication/{login,admin}`, `POST /api/auth/login` | `app/topics/190-authentication/**`, `app/api/auth/*/route.ts`, `lib/jwt.ts`, `lib/auth.ts` |
| 222 | Next.js interview questions | `/topics/222-nextjs-questions`, `/hydration` | `app/topics/222-nextjs-questions/**`, `app/topics/186-server-actions/actions.ts` (deleteTodo) |
