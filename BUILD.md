# Build & packaging

This repo holds two npm packages:

- `client/` — the VS Code / Neovim extension (debugger, formatter, language client glue).
- `server/` — the language server that powers go-to-definition, hover, semantic tokens, etc.

Both are bundled with **esbuild** (replacing the previous webpack setup).
A small Node orchestrator at `scripts/build.js` builds both packages and
stages the server artefacts into `client/` so that a single VSIX can be
produced.

## One-time setup

From the repository root:

```sh
npm install
```

The root `package.json` has no runtime dependencies of its own — its
`postinstall` script (`scripts/install-subpackages.js`) runs `npm install`
inside `client/` and `server/`. Each subpackage keeps its own
`node_modules`. (npm workspaces would hoist the externalised native module
out of `client/`, which would break the VSIX, so we deliberately do not
use them.)

## Building

```sh
npm run build         # production bundle (minified)
npm run build:dev     # development bundle (no minify, sourcemaps inline-friendly)
npm run build:server  # only re-bundle the server
npm run build:client  # only re-bundle the client (skips server stage)
```

Watch mode is available on each subpackage individually:

```sh
npm --prefix server run watch
npm --prefix client run watch
```

`npm run build` performs the following steps in order:

1. esbuild bundles `server/src/main.js` → `server/dist/hb_server.js` and
   copies `server/src/hbdocs.*` next to it.
2. The build script wipes `client/server/` and copies `server/dist/` plus
   `server/package.json` into it.
3. `test/dbg_lib.prg` is copied to `client/extra/dbg_lib.prg` with a
   version banner derived from `client/package.json`.
4. esbuild bundles `client/src/extension.js` and `client/src/debugger.js`
   into `client/dist/`.

## Packaging a VSIX

`vsce` invokes `vscode:prepublish`, which runs the orchestrator above, so
no separate build step is needed:

```sh
npm run package
# or directly:
cd client && npx @vscode/vsce package --out ../harbour-extension.vsix
```

The client bundle marks `@yagisumi/win-output-debug-string`, `bindings`,
and `file-uri-to-path` as **external** because the first contains a
`.node` native module that cannot be inlined. They are loaded at runtime
from `client/node_modules/`. `.vscodeignore` allowlists the necessary
files from those packages so they ship in the VSIX.

## CI / Release

- `.github/workflows/ci.yml` runs on pull requests and non-master pushes.
  It installs deps (root + subpackages), runs `npm run build`, packages a
  VSIX on both Ubuntu and Windows runners, and uploads each as a build
  artefact.
- `.github/workflows/release.yml` runs on pushes to master. It builds a
  VSIX, attaches it to a GitHub release tagged with the version from
  `client/package.json`, and updates the release if it already exists.

## What was removed

These files are no longer in the repo (do not bring them back):

- `client/copy.js`
- `server/copy.bat`
- `server/copy.sh`
- `client/webpack.config.js`
- `server/webpack.config.js`

And these dependencies are gone:

- `webpack`, `webpack-cli` (both packages)
- `node-loader` (client)
- `copy-webpack-plugin` (server)
