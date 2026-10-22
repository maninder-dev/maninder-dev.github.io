// Topic 219: Node.js Questions - spawn vs exec vs fork  (Full-Stack Handbook, Part 11)
// Run: npm run ex 219        (or: node 219-child-process.js)
// What it shows: spawn streams output as it arrives (good for big output), exec buffers it and
// runs through a shell (small output), fork starts a Node process with an IPC channel.
// A child "node -e" script stands in for ffmpeg, and "node --version" for git, so it runs anywhere.
import assert from 'node:assert/strict';
import { exec, fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';

// spawn: no shell, args as an array, stdout is a stream of chunks
const producer = 'for (let i = 1; i <= 5; i++) setTimeout(() => console.log("frame " + i), i * 30)';
const child = spawn(process.execPath, ['-e', producer]);
const chunks = [];
child.stdout.on('data', (d) => { chunks.push(d.toString().trim()); console.log('  spawn chunk:', d.toString().trim()); });
const [code] = await once(child, 'close');
assert.equal(code, 0);
assert.ok(chunks.length >= 3, 'output arrived in several pieces while the child was running');
assert.deepEqual(chunks.join('\n').split(/\r?\n/), ['frame 1', 'frame 2', 'frame 3', 'frame 4', 'frame 5']);

// exec: runs a command string in a shell (cmd.exe on Windows, /bin/sh elsewhere), buffers all output
const execP = promisify(exec);
const { stdout } = await execP(`"${process.execPath}" --version`);
console.log('exec stdout:', stdout.trim());
assert.equal(stdout.trim(), process.version);
// The shell is why exec is dangerous with user input: never build the string from req.body.
// maxBuffer (1 MB default) is why exec is wrong for big output:
await assert.rejects(execP(`"${process.execPath}" -e "process.stdout.write('x'.repeat(2e6))"`), /maxBuffer/);
console.log('exec with 2 MB of output -> rejected: maxBuffer exceeded (use spawn)');

// fork: a Node child with process.send / 'message'
const worker = fork(new URL('./lib/resize-worker.js', import.meta.url));
worker.send({ task: 'resize', file: 'a.png' });
const [msg] = await once(worker, 'message');
console.log('worker says', msg);
assert.deepEqual({ ...msg, pid: 0 }, { ok: true, file: 'a.png', output: 'a-200w.png', pid: 0 });
assert.notEqual(msg.pid, process.pid, 'separate process');
worker.send({ task: 'exit' });
assert.deepEqual(await once(worker, 'exit'), [0, null]);
console.log('OK');
