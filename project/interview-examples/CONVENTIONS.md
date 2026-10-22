# Conventions for the interview examples

Source handbooks (topic numbers below refer to these):

- Full-Stack: `c:\Users\user\Downloads\Full_Stack_Interview_Handbook (1).pdf` (topics 1-228)
- Laravel: `c:\Users\user\Downloads\Laravel_Interview_Handbook (1).pdf` (topics 1-107)

## Layout

```
interview-examples/
  README.md               index of every topic -> file
  fullstack/
    sql/      topics 1-56, 87-101, 216-217      PostgreSQL via PGlite (in-process, no server)
    mongo/    topics 57-86, 218                 MongoDB via mongodb-memory-server, Mongoose, Drizzle
    node/     topics 102-128, 219, 225          Node.js core + Express
    design/   topics 191-215, 223-224           JS core, HTTP, auth, TypeScript, system design
    react/    topics 129-170, 220-221           React 19 + Vitest + Testing Library
    nextjs/   topics 171-190, 222               Next.js App Router
  laravel/    topics 1-107                      Laravel app, examples run as tests
```

Each `fullstack/*` folder is its own npm package. Nothing needs Docker or a running database,
Redis or broker: use in-process substitutes (PGlite, mongodb-memory-server, ioredis-mock,
in-memory queues). If a topic is about infrastructure that can't run locally (Kafka, Kubernetes,
replication across machines), write a small faithful simulation and say so in the file header.

## Files

- One file per topic, named `NNN-short-slug.ext` with the zero-padded topic number
  (`105-event-loop.js`). Closely related small topics may share a file: `NNN-MMM-slug.ext`.
- Every file starts with a header comment:

  ```js
  // Topic 105: The Event Loop  (Full-Stack Handbook, Part 6)
  // Run: npm run ex 105        (or: node 105-event-loop.js)
  // What it shows: one or two plain sentences.
  ```

- Examples print short labelled output and **assert** what they demonstrate (`node:assert/strict`,
  or `expect` in test-based folders), so a broken example fails loudly.
- Go a little beyond the PDF snippet where it helps understanding (show the bug and the fix,
  print timings, print the query plan), but keep each file focused and under ~150 lines.
- Plain ES modules (`"type": "module"`), Node 22. Express servers listen on port 0 and close
  when done. No secrets, no network calls to the internet.

## Each package provides

- `npm run ex <topic>`: run the example(s) for one topic number.
- `npm test`: run every example in the folder and print a pass/fail line per file; exits non-zero
  on any failure.
- `README.md`: a table `Topic | Title | File | Run`, in topic order.
