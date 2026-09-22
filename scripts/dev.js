import { spawn } from 'node:child_process';

// Launch the installed entry points directly so this also works on Windows.
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env', 'src/server.js'], {
    cwd: new URL('../apps/api/', import.meta.url), stdio: 'inherit',
  }),
  spawn(process.execPath, ['../../node_modules/vite/bin/vite.js'], {
    cwd: new URL('../apps/web/', import.meta.url), stdio: 'inherit',
  }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
