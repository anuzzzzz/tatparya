import { buildApp } from './app.js';
import { env } from './env.js';
import { getRedis, closeRedis } from './lib/redis.js';

async function main() {
  const app = await buildApp();

  // Connect Redis eagerly so we know on startup if it's available
  try {
    const redis = getRedis();
    await redis.connect();
  } catch (err) {
    console.warn('⚠️  Redis not available — events will fail. Start Redis for full functionality.');
  }

  // Start server
  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    console.log(`
┌─────────────────────────────────────────────┐
│                                             │
│   🚀 Tatparya API running                  │
│                                             │
│   Local:    http://localhost:${env.API_PORT}         │
│   Health:   http://localhost:${env.API_PORT}/health  │
│   tRPC:     http://localhost:${env.API_PORT}/trpc    │
│                                             │
│   Environment: ${env.NODE_ENV.padEnd(27)}│
│                                             │
└─────────────────────────────────────────────┘
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    await app.close();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
