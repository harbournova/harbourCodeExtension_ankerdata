// @ts-check
'use strict';

// Cross-platform replacement for the old copy.bat / copy.sh / copy.js chain.
// Runs the server build, stages its output into client/server/, copies the
// debugger helper script with a version banner into client/extra/, then runs
// the client build. Invoked from `client/package.json` as
// `vscode:prepublish` so `vsce package` triggers it automatically.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const serverDir = path.join(repoRoot, 'server');
const clientDir = path.join(repoRoot, 'client');

const args = new Set(process.argv.slice(2));
const skipServer = args.has('--client-only');
const skipClient = args.has('--server-only');
const dev = args.has('--dev');

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function stageServerArtifacts() {
  console.log('[build] staging server artifacts into client/server');
  const stagingDir = path.join(clientDir, 'server');
  rmrf(stagingDir);
  fs.mkdirSync(path.join(stagingDir, 'dist'), { recursive: true });
  copyDir(path.join(serverDir, 'dist'), path.join(stagingDir, 'dist'));
  fs.copyFileSync(
    path.join(serverDir, 'package.json'),
    path.join(stagingDir, 'package.json')
  );
}

function copyDbgLib() {
  const src = path.join(repoRoot, 'test', 'dbg_lib.prg');
  if (!fs.existsSync(src)) {
    console.log('[build] skipping dbg_lib.prg (test/dbg_lib.prg not present)');
    return;
  }
  const extraDir = path.join(clientDir, 'extra');
  fs.mkdirSync(extraDir, { recursive: true });
  const pkg = require(path.join(clientDir, 'package.json'));
  const banner = `// For Harbour extension version v.${pkg.version}\r\n\r\n`;
  const body = fs.readFileSync(src);
  fs.writeFileSync(path.join(extraDir, 'dbg_lib.prg'), banner + body);
}

async function main() {
  if (!skipServer) {
    console.log('[build] server: esbuild');
    const { build: buildServer } = require(path.join(serverDir, 'build.js'));
    await buildServer({ dev });
    stageServerArtifacts();
  }
  copyDbgLib();
  if (!skipClient) {
    console.log('[build] client: esbuild');
    const { build: buildClient } = require(path.join(clientDir, 'build.js'));
    await buildClient({ dev });
  }
  console.log('[build] done');
}

main().catch((err) => {
  console.error('[build] failed:', err);
  process.exit(1);
});
