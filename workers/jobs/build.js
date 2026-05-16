/**
 * esbuild bundler for @lotris/workers (CommonJS — runs in any Node.js v16+)
 *
 * Bundles src/index.ts into a single dist/index.js.
 * - Everything is bundled inline EXCEPT:
 *   - Node.js core modules (auto-externalized by platform: 'node')
 *   - mssql (kept external — may have dynamic requires for native drivers)
 * - drizzle-orm/mssql-core & drizzle-orm/mssql2 aliased to local stubs
 */
const esbuild = require('esbuild');
const path = require('path');

const stubsDir = path.resolve(__dirname, '../../stubs');

/** @type {import('esbuild').Plugin} */
const lotrisBuildPlugin = {
  name: 'lotris-build',
  setup(build) {
    // Alias drizzle MSSQL submodules → local stubs
    build.onResolve({ filter: /^drizzle-orm\/mssql/ }, (args) => ({
      path: args.path.endsWith('mssql-core')
        ? path.join(stubsDir, 'drizzle-mssql-core.ts')
        : path.join(stubsDir, 'drizzle-mssql2.ts'),
    }));
  },
};

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/index.js',
    // mssql kept external: it uses optional native drivers (msnodesqlv8) that
    // cannot be statically bundled. pnpm installs it as a workspace dep.
    external: ['mssql'],
    plugins: [lotrisBuildPlugin],
    logLevel: 'info',
  })
  .then(() => {
    console.log('Workers bundle complete → dist/index.js');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

