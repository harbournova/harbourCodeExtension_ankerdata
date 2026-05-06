// @ts-check
'use strict';

// Run `npm install` inside both subpackages. We avoid npm workspaces because
// vsce's VSIX builder gets confused by hoisted node_modules — duplicate
// entries would land in the package, or the extension's runtime require()
// would miss its native module. Per-subpackage installs keep each
// node_modules tree isolated and make `vsce package` deterministic.

const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const targets = ['client', 'server'];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const target of targets) {
  const cwd = path.join(repoRoot, target);
  console.log(`[install] ${target}`);
  const result = spawnSync(npm, ['install'], {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    console.error(`[install] failed in ${target} (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}
