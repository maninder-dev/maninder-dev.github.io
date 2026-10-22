// Topic 207: Deployment Strategies  (Full-Stack Handbook, Part 10)
// Run: npm run ex 207        (or: node 207-deployment-strategies.js)
// What it shows: infra/k8s/deployment.yaml is NOT applied here (no cluster). This script parses and checks
// it, then simulates the rolling update its settings produce (maxSurge 1, maxUnavailable 0: capacity never
// drops), plus canary and feature-flag percentage rollouts with stable per-user bucketing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadAll } from 'js-yaml';

const docs = loadAll(readFileSync(new URL('./infra/k8s/deployment.yaml', import.meta.url), 'utf8'));
const dep = docs.find((d) => d.kind === 'Deployment');
const svc = docs.find((d) => d.kind === 'Service');
const c = dep.spec.template.spec.containers[0];

// ---- manifest checks ----
assert.equal(dep.apiVersion, 'apps/v1');
assert.deepEqual(dep.spec.selector.matchLabels, dep.spec.template.metadata.labels, 'selector must match pod labels');
assert.deepEqual(svc.spec.selector, dep.spec.template.metadata.labels, 'Service routes to these pods');
assert.equal(svc.spec.ports[0].targetPort, c.ports[0].containerPort);
assert.equal(c.readinessProbe.httpGet.path, '/ready');
assert.equal(c.livenessProbe.httpGet.path, '/health');
assert.ok(!c.image.endsWith(':latest') && c.image.includes(':'), 'image pinned to a tag');
assert.ok(c.resources.requests.cpu && c.resources.limits.memory, 'requests + memory limit set');
assert.equal(c.securityContext.runAsNonRoot, true);
console.log(`ok   manifest: ${dep.spec.replicas} replicas of ${c.image}, probes /ready + /health, Service -> ${svc.spec.ports[0].targetPort}`);

// ---- rolling update simulation ----
function rollingUpdate(replicas, { maxSurge, maxUnavailable }) {
  let oldPods = replicas, newReady = 0, newStarting = 0;
  const timeline = [];
  while (oldPods > 0 || newStarting > 0) {
    // start new pods while total stays within replicas + maxSurge
    while (oldPods + newReady + newStarting < replicas + maxSurge && newReady + newStarting < replicas) newStarting++;
    // kill old pods while available stays >= replicas - maxUnavailable (only ready pods count)
    while (oldPods > 0 && oldPods - 1 + newReady >= replicas - maxUnavailable) oldPods--;
    timeline.push({ old: oldPods, newReady, starting: newStarting, available: oldPods + newReady });
    // one probe period later the starting pods pass /ready
    newReady += newStarting; newStarting = 0;
  }
  const last = timeline.at(-1);
  if (last.starting) timeline.push({ old: 0, newReady, starting: 0, available: newReady });
  return timeline;
}
const ru = dep.spec.strategy.rollingUpdate;
const t = rollingUpdate(dep.spec.replicas, ru);
console.log(`     rolling update (maxSurge ${ru.maxSurge}, maxUnavailable ${ru.maxUnavailable}):`);
for (const s of t) console.log(`       old=${s.old} new ready=${s.newReady} starting=${s.starting} -> available ${s.available}`);
assert.ok(t.every((s) => s.available >= dep.spec.replicas), 'maxUnavailable 0: never below 4 serving pods');
assert.ok(t.every((s) => s.old + s.newReady + s.starting <= dep.spec.replicas + ru.maxSurge), 'never more than 5 pods');
assert.deepEqual(t.at(-1), { old: 0, newReady: 4, starting: 0, available: 4 });

// Faster but riskier: maxUnavailable 1 lets capacity dip
const fast = rollingUpdate(4, { maxSurge: 1, maxUnavailable: 1 });
assert.ok(fast.length < t.length && fast.some((s) => s.available < 4));
console.log(`     with maxUnavailable 1: ${fast.length} steps instead of ${t.length}, but capacity dips to ${Math.min(...fast.map((s) => s.available))}`);

// ---- canary and feature flags: hash the user id so each user stays in one bucket ----
const bucket = (userId, salt) => createHash('sha256').update(`${salt}:${userId}`).digest().readUInt32BE(0) % 100;
const inRollout = (userId, salt, percent) => bucket(userId, salt) < percent;
const users = Array.from({ length: 10_000 }, (_, i) => `user-${i}`);
const canaryShare = users.filter((u) => inRollout(u, 'api-v2', 5)).length / users.length;
console.log(`     canary at 5%: ${(canaryShare * 100).toFixed(1)}% of 10,000 users hit v2`);
assert.ok(canaryShare > 0.04 && canaryShare < 0.06);
// Raising the percentage only adds users; nobody flips back and forth between versions.
const at5 = new Set(users.filter((u) => inRollout(u, 'api-v2', 5)));
const at25 = new Set(users.filter((u) => inRollout(u, 'api-v2', 25)));
assert.ok([...at5].every((u) => at25.has(u)), 'stable bucketing');
// Blue-green is a pointer switch: instant rollback = flip it back.
const router = { live: 'blue', pools: { blue: 'v1 (4 pods)', green: 'v2 (4 pods, warmed up)' } };
const serve = () => router.pools[router.live];
router.live = 'green'; assert.match(serve(), /^v2/);   // cut over all traffic at once
router.live = 'blue';  assert.match(serve(), /^v1/);   // bad metrics? instant rollback
console.log('     blue-green: cut over to v2, rolled back to', serve());

console.log('OK: manifest checked (not applied); rollout behaviour simulated');
