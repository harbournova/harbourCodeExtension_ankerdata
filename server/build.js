// @ts-check
'use strict';

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.resolve(__dirname, 'dist');

const copyHbDocsPlugin = {
  name: 'copy-hbdocs',
  setup(build) {
    build.onEnd(() => {
      fs.mkdirSync(outdir, { recursive: true });
      for (const name of fs.readdirSync(path.join(__dirname, 'src'))) {
        if (name.startsWith('hbdocs.')) {
          fs.copyFileSync(
            path.join(__dirname, 'src', name),
            path.join(outdir, name)
          );
        }
      }
    });
  },
};

function makeOptions(dev) {
  /** @type {import('esbuild').BuildOptions} */
  return {
    entryPoints: [path.join(__dirname, 'src', 'main.js')],
    outfile: path.join(outdir, 'hb_server.js'),
    bundle: true,
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    sourcemap: true,
    minify: !dev,
    logLevel: 'info',
    plugins: [copyHbDocsPlugin],
  };
}

async function build({ dev = false, watch = false } = {}) {
  const options = makeOptions(dev);
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('[server] esbuild watching…');
    return ctx;
  }
  return esbuild.build(options);
}

module.exports = { build };

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  build({ dev: args.has('--dev'), watch: args.has('--watch') }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
