const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const lifecycleArgs = {
  dev: ['--host', '127.0.0.1'],
  build: ['build'],
  preview: ['preview', '--host', '127.0.0.1'],
};
const viteArgs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : lifecycleArgs[process.env.npm_lifecycle_event] ?? [];

function quoteForCmd(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

if (process.platform === 'win32') {
  const command = [
    'pushd',
    projectRoot,
    '&&',
    'node',
    'node_modules\\vite\\bin\\vite.js',
    ...viteArgs,
    '&&',
    'popd',
  ].join(' ');

  if (process.env.VITE_RUNNER_DEBUG) {
    console.error(command);
  }

  run('cmd.exe', ['/d', '/s', '/c', command], { cwd: process.env.SystemRoot || 'C:\\Windows' });
}

const vitePath = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
run(process.execPath, [vitePath, ...viteArgs]);
