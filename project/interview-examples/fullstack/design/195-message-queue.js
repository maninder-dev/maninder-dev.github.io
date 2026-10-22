// Topic 195: Message Queues  (Full-Stack Handbook, Part 10)
// Run: npm run ex 195        (or: node 195-message-queue.js)
// What it shows: a small in-memory job queue with the BullMQ-style options from the handbook -
// attempts, exponential backoff, concurrency and a dead-letter queue. (Simulation: BullMQ needs Redis.)
import assert from 'node:assert/strict';
import { sleep } from './lib.js';

class Queue {
  constructor(name) { this.name = name; this.waiting = []; this.dead = []; this.completed = []; this.nextId = 1; this.wake = null; }
  add(name, data, opts = {}) {
    const job = { id: this.nextId++, name, data, attempts: opts.attempts ?? 1, backoff: opts.backoff, attemptsMade: 0, log: [] };
    this.waiting.push({ job, runAt: Date.now() });
    this.wake?.();
    return job;
  }
}

class Worker {
  constructor(queue, handler, { concurrency = 1 } = {}) {
    Object.assign(this, { queue, handler, concurrency, active: 0, maxActive: 0, running: true });
    this.loops = Array.from({ length: concurrency }, () => this.loop());
  }
  async loop() {
    while (this.running) {
      const i = this.queue.waiting.findIndex((w) => w.runAt <= Date.now());
      if (i === -1) { await sleep(5); continue; }
      const [{ job }] = this.queue.waiting.splice(i, 1);
      this.active++; this.maxActive = Math.max(this.maxActive, this.active);
      job.attemptsMade++;
      job.log.push(Date.now());
      try {
        job.result = await this.handler(job);
        this.queue.completed.push(job);
      } catch (err) {
        job.failedReason = err.message;
        if (job.attemptsMade >= job.attempts) this.queue.dead.push(job); // DLQ: keep it for inspection
        else {
          const { type = 'fixed', delay = 0 } = job.backoff ?? {};
          const wait = type === 'exponential' ? delay * 2 ** (job.attemptsMade - 1) : delay;
          this.queue.waiting.push({ job, runAt: Date.now() + wait });
        }
      } finally { this.active--; }
    }
  }
  async close() { this.running = false; await Promise.all(this.loops); }
}

const emailQueue = new Queue('emails');
const sent = [];
const failuresLeft = new Map([[2, 2]]); // user 2's mail server fails twice, then works

const worker = new Worker(emailQueue, async (job) => {
  await sleep(20); // pretend to talk to SMTP
  const { userId } = job.data;
  if (userId === 666) throw new Error('mailbox does not exist');                  // permanent failure
  if (failuresLeft.get(userId) > 0) {                                            // transient failure
    failuresLeft.set(userId, failuresLeft.get(userId) - 1);
    throw new Error('SMTP 421 try later');
  }
  sent.push(userId);
  return 'sent';
}, { concurrency: 3 });

// Producer: the signup handler only enqueues and returns immediately.
const t0 = Date.now();
for (const userId of [1, 2, 3, 4, 5, 666]) {
  emailQueue.add('welcome', { userId }, { attempts: 4, backoff: { type: 'exponential', delay: 30 } });
}
console.log(`enqueued 6 jobs in ${Date.now() - t0} ms (the request path stays fast)`);

while (emailQueue.completed.length + emailQueue.dead.length < 6) await sleep(10);
await worker.close();

const job2 = emailQueue.completed.find((j) => j.data.userId === 2);
const gaps = job2.log.slice(1).map((t, i) => t - job2.log[i]);
console.log('sent to users       :', sent.sort((a, b) => a - b).join(', '));
console.log('user 2 attempts     :', job2.attemptsMade, ' gaps between tries (ms):', gaps.join(', '));
console.log('dead-letter queue   :', emailQueue.dead.map((j) => `user ${j.data.userId} after ${j.attemptsMade} tries: ${j.failedReason}`));
console.log('max jobs in parallel:', worker.maxActive);

assert.deepEqual(sent, [1, 2, 3, 4, 5]);
assert.equal(job2.attemptsMade, 3, 'two transient failures then success');
assert.ok(gaps[0] >= 30 + 20 - 5 && gaps[1] >= 60 + 20 - 5, 'backoff doubles: ~30 ms then ~60 ms (+ work time)');
assert.ok(gaps[1] > gaps[0]);
assert.equal(emailQueue.dead.length, 1);
assert.equal(emailQueue.dead[0].attemptsMade, 4, 'gave up after max attempts');
assert.ok(worker.maxActive <= 3 && worker.maxActive > 1, 'concurrency limit respected');
console.log('OK: retries with exponential backoff, DLQ after max attempts, bounded concurrency');
