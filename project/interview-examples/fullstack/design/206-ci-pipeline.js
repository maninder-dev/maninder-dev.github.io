// Topic 206: CI/CD Pipelines  (Full-Stack Handbook, Part 10)
// Run: npm run ex 206        (or: node 206-ci-pipeline.js)
// What it shows: the real GitHub Actions workflow in infra/.github/workflows/ci.yml is NOT executed here.
// This script parses it, checks the CI rules (lint, typecheck, test before deploy; deploy only from
// main; images tagged by commit SHA) and simulates which jobs run for a PR, a main push, and a red build.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

const wf = load(readFileSync(new URL('./infra/.github/workflows/ci.yml', import.meta.url), 'utf8'));
const { test, deploy } = wf.jobs;
const runs = (job) => job.steps.filter((s) => s.run).map((s) => s.run);

// YAML 1.2 (js-yaml 4+) keeps `on` as a string key; YAML 1.1 parsers would read it as `true`.
assert.deepEqual(Object.keys(wf.on).sort(), ['pull_request', 'push']);
assert.deepEqual(wf.on.push.branches, ['main']);

// CI: checkout, setup-node with npm cache, then npm ci (lockfile), lint + typecheck, tests
assert.equal(test.steps[0].uses, 'actions/checkout@v4');
assert.equal(test.steps[1].with.cache, 'npm');
const testCmds = runs(test);
assert.equal(testCmds[0], 'npm ci', 'npm ci, not npm install: reproducible from the lockfile');
assert.ok(testCmds.some((c) => c.includes('lint')) && testCmds.some((c) => c.includes('typecheck')));
const testStep = test.steps.find((s) => s.run?.startsWith('npm test'));
assert.ok(testStep.env.DATABASE_URL.includes('localhost:5432'), 'tests talk to the real Postgres service container');
assert.equal(test.services.postgres.image, 'postgres:16');
assert.equal(test.services.postgres.env.POSTGRES_PASSWORD, new URL(testStep.env.DATABASE_URL).password);
console.log('ok   test job:', testCmds.join('  ->  '));

// CD: gated on tests and on the main branch, image tagged with the immutable commit SHA
assert.equal(deploy.needs, 'test');
assert.equal(deploy.if, "github.ref == 'refs/heads/main'");
const deployCmds = runs(deploy);
assert.ok(deployCmds.every((c) => !c.startsWith('docker') || c.includes('${{ github.sha }}')), 'never deploy :latest');
assert.ok(deployCmds.findIndex((c) => c.startsWith('docker push')) < deployCmds.findIndex((c) => c.includes('deploy.sh')));
console.log('ok   deploy job:', deployCmds.length, 'steps, needs test, main only, tagged by SHA');

// Simulate the job graph for different events
function plan(event, ref, testPasses = true) {
  const ran = [];
  const result = {};
  const order = Object.keys(wf.jobs);            // `needs` makes this a DAG; ours is linear
  for (const name of order) {
    const job = wf.jobs[name];
    const needs = [job.needs].flat().filter(Boolean);
    if (needs.some((n) => result[n] !== 'success')) { result[name] = 'skipped'; continue; }
    if (job.if) {
      const m = job.if.match(/github\.ref == '(.+)'/);
      if (m && m[1] !== ref) { result[name] = 'skipped'; continue; }
    }
    ran.push(name);
    result[name] = name === 'test' && !testPasses ? 'failure' : 'success';
  }
  console.log(`     ${event.padEnd(22)} -> ${Object.entries(result).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  return result;
}
assert.deepEqual(plan('pull_request', 'refs/pull/7/merge'), { test: 'success', deploy: 'skipped' });
assert.deepEqual(plan('push to main', 'refs/heads/main'), { test: 'success', deploy: 'success' });
assert.deepEqual(plan('push to main, red tests', 'refs/heads/main', false), { test: 'failure', deploy: 'skipped' });

console.log('OK: workflow checked and simulated (not executed)');
