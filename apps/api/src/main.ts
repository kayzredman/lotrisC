import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { getEnv } from '@lotris/config';
import { AppModule } from './app.module';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';

async function bootstrap() {
  const env = getEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: env.NODE_ENV === 'development' }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin:
      env.NODE_ENV === 'production'
        ? ['https://app.lotris.io']
        : ['http://localhost:3000'],
    credentials: true,
  });

  // ── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── tRPC ─────────────────────────────────────────────────────────────────
  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }: { path?: string; error: { code: string; message: string } }) {
        // Log server errors; surface only safe messages to clients
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          console.error(`[tRPC] Error on ${path}:`, error);
        }
      },
    },
  });

  // ── OpenAPI (REST v1) — skip in tsx/dev (emitDecoratorMetadata not available) ──
  if (env.NODE_ENV !== 'production' && process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Lotris API')
      .setDescription('Lotris REST v1 — for third-party integrations')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.API_PORT, '0.0.0.0');
  console.log(`🚀  Lotris API running on http://0.0.0.0:${env.API_PORT}`);
}

bootstrap();
