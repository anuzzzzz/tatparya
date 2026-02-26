import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { appRouter, type AppRouter } from './trpc/router.js';
import { createContext } from './trpc/context.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
    maxParamLength: 5000,
  });

  // CORS
  await app.register(cors, {
    origin: true, // Allow all in dev; lock down in production
    credentials: true,
  });

  // Raw health endpoint (no tRPC, useful for load balancers)
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // tRPC plugin
  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        console.error(`❌ tRPC error on ${path}:`, error.message);
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  return app;
}
