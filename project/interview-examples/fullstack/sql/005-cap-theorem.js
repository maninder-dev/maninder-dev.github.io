// Topic 5: CAP Theorem  (Full-Stack Handbook, Part 1)
// Run: npm run ex 5        (or: node 005-cap-theorem.js)
// What it shows (simulation): two replicas and a network partition. A CP store refuses the write
// it can't replicate; an AP store accepts it and serves a stale read until the partition heals.
import assert from 'node:assert/strict';

class Cluster {
  constructor(mode) {
    this.mode = mode;
    this.nodes = { east: { likes: 1203 }, west: { likes: 1203 } };
    this.partitioned = false;
    this.pending = [];
  }
  write(node, key, value) {
    if (this.partitioned && this.mode === 'CP') throw new Error('503: cannot reach a majority, write refused');
    this.nodes[node][key] = value;
    const other = node === 'east' ? 'west' : 'east';
    if (this.partitioned) this.pending.push([other, key, value]);
    else this.nodes[other][key] = value;
    return 'ok';
  }
  read(node, key) { return this.nodes[node][key]; }
  heal() {
    this.partitioned = false;
    for (const [n, k, v] of this.pending.splice(0)) this.nodes[n][k] = v;
  }
}

for (const mode of ['CP', 'AP']) {
  console.log(`\n--- ${mode} system`);
  const c = new Cluster(mode);
  c.write('east', 'likes', 1204);
  assert.equal(c.read('west', 'likes'), 1204, 'healthy network: both replicas agree');
  c.partitioned = true;
  console.log('  network partition between east and west');
  let result;
  try { result = c.write('east', 'likes', 1205); } catch (e) { result = e.message; }
  console.log(`  write 1205 on east -> ${result}`);
  console.log(`  read on west       -> ${c.read('west', 'likes')}`);
  if (mode === 'CP') {
    assert.match(result, /refused/); // gave up Availability...
    assert.equal(c.read('west', 'likes'), c.read('east', 'likes')); // ...kept Consistency
  } else {
    assert.equal(result, 'ok'); // stayed Available...
    assert.equal(c.read('west', 'likes'), 1204); // ...but west is stale
    c.heal();
    console.log(`  partition heals    -> west now ${c.read('west', 'likes')} (eventually consistent)`);
    assert.equal(c.read('west', 'likes'), 1205);
  }
}
console.log('\nBank balance -> CP. A "likes" counter -> AP is fine.');
console.log('\nOK');
