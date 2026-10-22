// Worker thread used by 110-blocking-event-loop.js and 219-cpu-work-and-jobs.js.
import { parentPort, workerData } from 'node:worker_threads';

let sum = 0;
for (let i = 0; i < workerData; i++) sum += i;
parentPort.postMessage(sum);
