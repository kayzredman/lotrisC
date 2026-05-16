// Custom webpack config for NestJS production build.
// Required because pnpm symlinks workspace packages (@lotris/*) into node_modules,
// so webpack-node-externals would skip them — leaving raw .ts files at runtime.
// We allowlist @lotris/* so webpack bundles them inline, and add resolve aliases
// for the custom MSSQL stubs that have no real npm package counterpart.

const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Bundle workspace packages inline; everything else stays external.
        allowlist: [/^@lotris\//],
      }),
    ],
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve?.alias ?? {}),
        // Redirect custom MSSQL stub imports to real files so webpack can inline them.
        'drizzle-orm/mssql-core': path.resolve(__dirname, '../../stubs/drizzle-mssql-core.ts'),
        'drizzle-orm/mssql2': path.resolve(__dirname, '../../stubs/drizzle-mssql2.ts'),
      },
    },
    module: {
      ...options.module,
      rules: [
        // Replace the default ts-loader rule with transpileOnly: true so that
        // rootDir constraints are not enforced across workspace boundaries.
        {
          test: /\.tsx?$/,
          use: { loader: 'ts-loader', options: { transpileOnly: true } },
          exclude: /node_modules/,
        },
        // Keep any non-ts rules from the NestJS defaults (e.g. asset loaders).
        ...(options.module?.rules ?? []).filter((r) => !/\.tsx?/.test(String(r.test))),
      ],
    },
  };
};
