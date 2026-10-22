// Child process used by 219-child-process.js (started with fork, talks over IPC).
process.on('message', (msg) => {
  if (msg.task === 'resize') process.send({ ok: true, file: msg.file, output: msg.file.replace('.png', '-200w.png'), pid: process.pid });
  if (msg.task === 'exit') process.disconnect();
});
