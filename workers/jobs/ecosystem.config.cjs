// Local-dev pm2 config — NOT committed (see .gitignore)
module.exports = {
  apps: [
    {
      name: 'lotris-workers',
      script: '/Users/kwekku/Desktop/Builds/Helpdesk_KPI_sys/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs',
      args: 'src/index.ts',
      interpreter: '/Users/kwekku/.nvm/versions/node/v24.13.0/bin/node',
      interpreter_args: '--env-file=/Users/kwekku/Desktop/Builds/Helpdesk_KPI_sys/workers/jobs/.env',
      cwd: '/Users/kwekku/Desktop/Builds/Helpdesk_KPI_sys/workers/jobs',
      watch: false,
    },
  ],
};
