const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

config.watcher = {
  ...config.watcher,
  healthCheck: { enabled: false },
};

config.resolver.blockList = [
  /\/apps\/web\/.*/,
  /\/src\/Lotris\..*/,
  /\/docs\/.*/,
  /\/mockups\/.*/,
  /\/docker\/.*/,
  /\/deploy\/.*/,
  /\/\.cursor\/.*/,
  /\/\.git\/.*/,
  /\/\.turbo\/.*/,
  /\/packages\/db\/.*/,
  /\/scripts\/.*/,
];

module.exports = config;
