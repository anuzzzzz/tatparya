import { z } from 'zod';
import { router, publicProcedure } from '../trpc/trpc.js';
import { getRedis } from '../lib/redis.js';

export const healthRouter = router({
  /**
   * Basic health check — always returns OK
   */
  check: publicProcedure.query(() => {
    return {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }),

  /**
   * Deep health check — verifies all dependencies
   */
  deep: publicProcedure.query(async ({ ctx }) => {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      const { error } = await ctx.serviceDb.from('stores').select('id').limit(1);
      checks['database'] = {
        status: error ? 'error' : 'ok',
        latencyMs: Date.now() - dbStart,
      };
    } catch {
      checks['database'] = { status: 'error', latencyMs: Date.now() - dbStart };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      const redis = getRedis();
      await redis.ping();
      checks['redis'] = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch {
      checks['redis'] = { status: 'error', latencyMs: Date.now() - redisStart };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allOk ? ('ok' as const) : ('degraded' as const),
      timestamp: new Date().toISOString(),
      checks,
    };
  }),
});
