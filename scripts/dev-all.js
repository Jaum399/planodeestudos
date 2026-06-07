const { spawn } = require('child_process');
const path = require('path');

function run(name, cwd) {
  const command = process.platform === 'win32' ? 'npm run dev' : 'npm run dev';
  const child = spawn(command, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${name}] encerrado com erro (code=${code})`);
      process.exitCode = code || 1;
    }
  });

  return child;
}

const root = process.cwd();
const backend = run('backend', path.join(root, 'backend'));
const frontend = run('frontend', path.join(root, 'frontend'));

function shutdown() {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
