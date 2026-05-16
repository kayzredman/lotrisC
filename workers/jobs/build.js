/**
 * esbuild bundler for @lotris/workers (CommonJS — runs in any Node.js v16+)
 *
 * Bundles src/index.ts into a single dist/index.js.
 * - @lotris/* workspace packages are inlined (they're raw TypeScript source)
 * - All other node_modules are kept external (resolved at runtime)
 * - drizzle-orm/mssql-core & drizzle-orm/mssql2 are aliased to local stubs
 *   (these submodules don't exist in the published drizzle-orm package)
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

    // Externalize all node_modules EXCEPT @lotris/* workspace packages
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith('@lotris/')) return null; // bundle inline
      return { path: args.path, external: true };
    });
  },
};

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/index.js',
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
