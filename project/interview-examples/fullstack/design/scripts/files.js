// Shared helper for the runners: finds example files and runs one in a child process.
import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Example files live at the package root and start with a 3-digit topic number.
export function exampleFiles() {
  return readdirSync(root).filter((f) => /^\d{3}(-\d{3})?-.*\.(js|ts)$/.test(f)).sort();
}

export function topicsOf(file) {
  const m = file.match(/^(\d{3})(?:-(\d{3}))?-/);
  const from = Number(m[1]); const to = m[2] ? Number(m[2]) : from;
  return { from, to };
}

// .ts files run through tsx's loader; .js files run with plain node.
export function runFile(file, { quiet = false } = {}) {
  const args = file.endsWith('.ts') ? ['--import', 'tsx', file] : [file];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: quiet ? 'pipe' : 'inherit' });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    const timer = setTimeout(() => child.kill(), 60_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
}
