// Deterministic simulations for things a single PGlite connection cannot show directly:
// two transactions running at the same time. Both models follow PostgreSQL's rules.

export class SerializationError extends Error {
  constructor(msg) { super(msg); this.code = '40001'; }
}
export class DeadlockError extends Error {
  constructor(msg) { super(msg); this.code = '40P01'; }
}
export class WouldBlock extends Error {
  constructor(msg) { super(msg); this.code = 'WAIT'; }
}

// A tiny MVCC row store: each key has a chain of versions { value, xmin, xmax }.
// Isolation 'read committed' takes a new snapshot per statement; 'repeatable read'
// takes one at the first statement; 'read uncommitted' (textbook, NOT PostgreSQL) sees dirty data.
export class MvccStore {
  constructor(initial = {}) {
    this.nextXid = 500;
    this.committed = new Set([1]);
    this.aborted = new Set();
    this.rows = new Map(Object.entries(initial).map(([k, v]) => [k, [{ value: v, xmin: 1, xmax: 0 }]]));
  }
  begin(name, isolation = 'read committed') {
    return { name, isolation, xid: this.nextXid++, snapshot: null, done: false };
  }
  snapshotFor(tx) {
    const fresh = () => ({ committed: new Set(this.committed) });
    if (tx.isolation === 'repeatable read' || tx.isolation === 'serializable') return (tx.snapshot ??= fresh());
    return fresh();
  }
  seen(tx, snap, xid) {
    if (xid === tx.xid) return true;
    if (tx.isolation === 'read uncommitted') return !this.aborted.has(xid);
    return snap.committed.has(xid);
  }
  visibleVersion(tx, key) {
    const snap = this.snapshotFor(tx);
    return (this.rows.get(key) ?? []).find((v) => this.seen(tx, snap, v.xmin) && !(v.xmax && this.seen(tx, snap, v.xmax)));
  }
  read(tx, key) { return this.visibleVersion(tx, key)?.value; }
  // Range read for phantom demos: all visible keys matching a predicate.
  scan(tx, pred = () => true) {
    return [...this.rows.keys()].filter((k) => { const v = this.visibleVersion(tx, k); return v && pred(k, v.value); });
  }
  write(tx, key, value) {
    this.snapshotFor(tx); // repeatable read: the first statement (even a write) fixes the snapshot
    const chain = this.rows.get(key) ?? [];
    const live = chain.find((v) => !this.aborted.has(v.xmin) && (!v.xmax || this.aborted.has(v.xmax)));
    if (live && live.xmin !== tx.xid && !this.committed.has(live.xmin)) {
      throw new WouldBlock(`${tx.name} waits: row ${key} is locked by an uncommitted writer (xid ${live.xmin})`);
    }
    if (live && tx.snapshot && !this.seen(tx, tx.snapshot, live.xmin)) {
      throw new SerializationError(`could not serialize access due to concurrent update (row ${key})`);
    }
    if (live) live.xmax = tx.xid;
    chain.unshift({ value, xmin: tx.xid, xmax: 0 });
    this.rows.set(key, chain);
  }
  commit(tx) { this.committed.add(tx.xid); tx.done = true; }
  rollback(tx) { this.aborted.add(tx.xid); tx.done = true; }
  versions(key) { return (this.rows.get(key) ?? []).map((v) => ({ ...v })); }
}

// Exclusive row-lock manager with a wait-for graph, like PostgreSQL's deadlock detector.
export class LockManager {
  constructor() { this.holder = new Map(); this.waitingFor = new Map(); this.log = []; }
  acquire(session, key) {
    const h = this.holder.get(key);
    if (!h || h === session) { this.holder.set(key, session); this.log.push(`${session} locks ${key}`); return 'granted'; }
    this.waitingFor.set(session, key);
    if (this.hasCycle(session)) {
      this.waitingFor.delete(session);
      throw new DeadlockError(`deadlock detected: ${session} waits for ${key} held by ${h}, which waits for ${session}`);
    }
    this.log.push(`${session} WAITS for ${key} (held by ${h})`);
    return 'waiting';
  }
  hasCycle(start) {
    let s = start;
    for (let i = 0; i < 100; i++) {
      const key = this.waitingFor.get(s);
      if (!key) return false;
      s = this.holder.get(key);
      if (s === start) return true;
    }
    return false;
  }
  // Release every lock of a session; hand each freed key to the first waiter. Returns woken sessions.
  releaseAll(session) {
    const woken = [];
    for (const [key, h] of this.holder) {
      if (h !== session) continue;
      this.holder.delete(key);
      const waiter = [...this.waitingFor].find(([, k]) => k === key)?.[0];
      if (waiter) { this.waitingFor.delete(waiter); this.holder.set(key, waiter); woken.push(waiter); }
    }
    this.log.push(`${session} releases its locks${woken.length ? `, wakes ${woken.join(', ')}` : ''}`);
    return woken;
  }
}

// Print a two-column timeline step.
export function step(session, text) {
  const col = session === 'A' ? '' : ' '.repeat(36);
  console.log(`  ${col}${session}: ${text}`);
}
