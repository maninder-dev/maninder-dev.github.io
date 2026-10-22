// Topic 205: Docker  (Full-Stack Handbook, Part 10)
// Run: npm run ex 205        (or: node 205-docker.js)
// What it shows: the real infra/Dockerfile and infra/docker-compose.yml are NOT built or run here (no
// Docker needed). This script parses them and checks the practices the handbook names: multi-stage
// build, prod-only deps, non-root user, healthcheck, exec-form CMD, compose wiring. It also starts
// infra/server.js to prove the /health endpoint the HEALTHCHECK calls really answers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const dir = new URL('./infra/', import.meta.url);

// ---- Dockerfile: a tiny parser (instruction + args, comments and blank lines skipped) ----
const instructions = readFileSync(new URL('Dockerfile', dir), 'utf8').split(/\r?\n/)
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [cmd, ...rest] = l.split(/\s+/); return { cmd: cmd.toUpperCase(), args: rest.join(' ') }; });
const all = (cmd) => instructions.filter((i) => i.cmd === cmd);
const stages = all('FROM');
const finalStage = instructions.slice(instructions.lastIndexOf(stages.at(-1)));
const inFinal = (cmd) => finalStage.filter((i) => i.cmd === cmd);

const checks = {
  'multi-stage build (2+ FROM)': stages.length >= 2,
  'pinned base image tag (not :latest)': stages.every((s) => /:\S+/.test(s.args) && !/:latest\b/.test(s.args)),
  'npm ci --omit=dev in the deps stage': all('RUN').some((r) => /npm ci\b.*--omit=dev/.test(r.args)),
  'final stage copies node_modules from deps': inFinal('COPY').some((c) => c.args.startsWith('--from=deps')),
  'package*.json copied before source (layer caching)': instructions.findIndex((i) => i.args.startsWith('package')) < instructions.findIndex((i) => i.args === '. .'),
  'NODE_ENV=production': inFinal('ENV').some((e) => e.args === 'NODE_ENV=production'),
  'runs as non-root USER': inFinal('USER').length === 1 && inFinal('USER')[0].args !== 'root',
  'HEALTHCHECK hits /health': inFinal('HEALTHCHECK').some((h) => h.args.includes('/health')),
  'CMD in exec form (receives SIGTERM)': /^\[.*\]$/.test(inFinal('CMD')[0]?.args ?? ''),
  'no inline comments on instruction lines': instructions.every((i) => !/\s#\s/.test(i.args)),
};
for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'ok  ' : 'FAIL'} Dockerfile: ${name}`);
assert.ok(Object.values(checks).every(Boolean), 'Dockerfile checks');

const dockerignore = readFileSync(new URL('.dockerignore', dir), 'utf8');
assert.match(dockerignore, /^node_modules$/m);
assert.match(dockerignore, /^\.env$/m, 'never bake secrets into the image');
console.log('ok   .dockerignore excludes node_modules and .env');

// ---- docker-compose.yml ----
const compose = load(readFileSync(new URL('docker-compose.yml', dir), 'utf8'));
const { api, db, cache } = compose.services;
assert.deepEqual(Object.keys(compose.services), ['api', 'db', 'cache']);
assert.deepEqual(Object.keys(api.depends_on), ['db', 'cache']);
assert.equal(api.depends_on.db.condition, 'service_healthy', 'api waits for Postgres to be ready, not just started');
assert.ok(db.healthcheck.test.join(' ').includes('pg_isready'));
const dbUrl = new URL(api.environment.DATABASE_URL);
assert.equal(dbUrl.hostname, 'db', 'containers reach each other by service name');
assert.equal(dbUrl.username, db.environment.POSTGRES_USER);
assert.equal(dbUrl.password, db.environment.POSTGRES_PASSWORD);
assert.equal(dbUrl.pathname.slice(1), db.environment.POSTGRES_DB);
assert.equal(new URL(api.environment.REDIS_URL).hostname, 'cache');
assert.ok(db.volumes[0].startsWith('pgdata:') && 'pgdata' in compose.volumes, 'named volume keeps data across restarts');
assert.match(cache.image, /^redis:\d/);
console.log('ok   docker-compose: service names, credentials, healthcheck, volume all consistent');

// ---- the app the image runs: does /health answer? ----
const child = spawn(process.execPath, [fileURLToPath(new URL('server.js', dir))], { env: { ...process.env, PORT: '0' } });
const port = await new Promise((resolve, reject) => {
  child.stdout.on('data', (d) => { const m = String(d).match(/listening on (\d+)/); if (m) resolve(m[1]); });
  child.on('exit', (code) => reject(new Error(`server exited ${code}`)));
});
const health = await fetch(`http://127.0.0.1:${port}/health`);
assert.equal(health.status, 200);
console.log('ok   infra/server.js /health ->', health.status, await health.text());
child.kill();

console.log('OK: Dockerfile and compose file follow the handbook practices (files checked, not executed)');
