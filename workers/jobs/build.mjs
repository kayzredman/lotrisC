/**
 * esbuild bundler for @lotris/workers
 *
 * Bundles the workers into a single dist/index.js. Workspace packages
 * (@lotris/*) are inlined; all other node_modules are kept external so
 * Railway resolves them from the installed node_modules at runtime.
 *
 * drizzle-orm/mssql-core and drizzle-orm/mssql2 don't exist in the published
 * drizzle-orm package — they are aliased to local stubs (same approach used
 * by the NestJS API webpack build).
 */

import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stubsDir = path.resolve(__dirname, '../../stubs');

/** @type {import('esbuild').Plugin} */
const lotrisBuildPlugin = {
  name: 'lotris-build',
  setup(build) {
    // Alias drizzle MSSQL submodules that don't exist in npm → local stubs
    build.onResolve({ filter: /^drizzle-orm\/mssql/ }, (args) => ({
      path: args.path.endsWith('mssql-core')
        ? path.join(stubsDir, 'drizzle-mssql-core.ts')
        : path.join(stubsDir, 'drizzle-mssql2.ts'),
    }));

    // Externalize all node_modules EXCEPT @lotris/* workspace packages
    // (those must be bundled inline since they're raw TypeScript source)
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith('@lotris/')) return null; // let esbuild bundle it
      return { path: args.path, external: true };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/index.js',
  plugins: [lotrisBuildPlugin],
  logLevel: 'info',
});

console.log('✓ Workers bundle complete → dist/index.js');
