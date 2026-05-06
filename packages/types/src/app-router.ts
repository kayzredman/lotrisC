/**
 * AppRouter type stub.
 * The actual router is defined in apps/api/src/trpc/router.ts.
 * That file exports `export type { AppRouter }` which is then re-exported here
 * so the web app can import it without pulling in NestJS runtime code.
 *
 * During build, apps/api must build before @lotris/types can resolve AppRouter.
 * Turborepo handles this via the `dependsOn: ["^build"]` pipeline.
 *
 * For now this is a placeholder type — replaced by the real router type once
 * apps/api is built.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppRouter = any;
