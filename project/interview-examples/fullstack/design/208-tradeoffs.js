// Topic 208: Interview Checklist: Trade-offs to Mention  (Full-Stack Handbook, Part 10)
// Run: npm run ex 208        (or: node 208-tradeoffs.js)
// What it shows: two checklist trade-offs made measurable with a tiny simulation.
// 1) Consistency vs availability: async replication gives stale reads; sync replication refuses writes
//    when the replica is unreachable. 2) Push vs pull feeds: write cost vs read cost, and the celebrity case.
import assert from 'node:assert/strict';

// ---------- 1. Consistency vs availability ----------
class Cluster {
  constructor(mode) { this.mode = mode; this.primary = new Map(); this.replica = new Map(); this.replicaUp = true; this.lag = []; }
  write(k, v) {
    if (this.mode === 'sync') {
      if (!this.replicaUp) throw new Error('write refused: replica unreachable (choosing consistency)');
      this.primary.set(k, v); this.replica.set(k, v);
    } else {
      this.primary.set(k, v); this.lag.push([k, v]); // shipped to the replica "later"
    }
  }
  replicate() { if (this.replicaUp) for (const [k, v] of this.lag.splice(0)) this.replica.set(k, v); }
  readFromReplica(k) { return this.replica.get(k); }
}

const asyncC = new Cluster('async');
asyncC.write('profile:7:name', 'Ann');
asyncC.replicate();
asyncC.write('profile:7:name', 'Ann Smith');            // user renames themselves...
const stale = asyncC.readFromReplica('profile:7:name');  // ...and the next page load hits a replica
console.log('async: read-after-write from replica ->', stale, '(stale)');
assert.equal(stale, 'Ann');
asyncC.replicate();
assert.equal(asyncC.readFromReplica('profile:7:name'), 'Ann Smith');
console.log('async: after replication            ->', asyncC.readFromReplica('profile:7:name'), '(eventually consistent)');
asyncC.replicaUp = false;
asyncC.write('profile:7:name', 'A. Smith');              // still accepts writes: available
console.log('async: replica down, write accepted (available, but replica falls further behind)');

const syncC = new Cluster('sync');
syncC.write('profile:7:name', 'Ann Smith');
assert.equal(syncC.readFromReplica('profile:7:name'), 'Ann Smith');
console.log('sync : read-after-write from replica ->', syncC.readFromReplica('profile:7:name'), '(consistent)');
syncC.replicaUp = false;
assert.throws(() => syncC.write('profile:7:name', 'A. Smith'), /refused/);
console.log('sync : replica down, write refused (consistent, not available)');

// ---------- 2. Push (fan-out on write) vs pull (fan-out on read) ----------
// Count the work for one day: N users, each posts p times and opens the feed r times.
function cost({ users, followersPerUser, postsPerUser, readsPerUser, followingPerUser }) {
  const push = { writes: users * postsPerUser * followersPerUser, readQueries: users * readsPerUser * 1 };
  const pull = { writes: users * postsPerUser, readQueries: users * readsPerUser * followingPerUser };
  return { push, pull };
}
const normal = cost({ users: 1_000_000, followersPerUser: 200, followingPerUser: 200, postsPerUser: 2, readsPerUser: 20 });
console.log('feeds: push =', normal.push, '| pull =', normal.pull);
assert.ok(normal.push.writes + normal.push.readQueries < normal.pull.writes + normal.pull.readQueries,
  'read-heavy app: pushing into inboxes is cheaper overall');

// A celebrity with 50M followers posting once = 50M inbox writes with push.
const celebrityPushWrites = 50_000_000;
console.log('feeds: one celebrity post with push =', celebrityPushWrites.toLocaleString(), 'inbox writes -> pull those at read time (hybrid)');
assert.ok(celebrityPushWrites > normal.push.writes / 10);

console.log('OK: each choice was stated, chosen, and its cost shown');
