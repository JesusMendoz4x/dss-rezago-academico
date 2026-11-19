import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireClient = createRequire(new URL('../client/package.json', import.meta.url));
const vite = path.join(path.dirname(requireClient.resolve('vite/package.json')), 'bin/vite.js');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); }
      catch { /* El hijo puede haber terminado al recibir Ctrl+C. */ }
    } else child.kill('SIGTERM');
  }
}
for (const [name, args, directory] of [
  ['API', ['--watch', 'src/index.js'], 'server'],
  ['Web', [vite], 'client'],
]) {
  const child = spawn(process.execPath, args, { cwd: path.join(root, directory), stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', (error) => { console.error(`${name}: ${error.message}`); stop(1); });
  child.on('exit', (code) => { if (!stopping) { console.error(`${name} se detuvo.`); stop(code || 1); } });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
