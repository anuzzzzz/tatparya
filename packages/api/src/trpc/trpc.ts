import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context.js';

// ============================================================
// tRPC Instance
// ============================================================

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// ============================================================
// Auth Middleware
// Ensures user is authenticated via Supabase JWT
// ============================================================

const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now guaranteed non-null
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// ============================================================
// Store Context Middleware
// Ensures store_id is present and the user owns/has access to it.
// This is the PRIMARY tenant isolation mechanism.
// ============================================================

const hasStoreAccess = middleware(async ({ ctx, next, rawInput }) => {
  // Store ID comes from either the input or the user's default store
  const input = rawInput as Record<string, unknown> | undefined;
  const storeId = input?.['storeId'] as string | undefined;

  if (!storeId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'storeId is required for this operation',
    });
  }

  // Verify the user has access to this store
  if (ctx.user) {
    const { data: store } = await ctx.db
      .from('stores')
      .select('id, owner_id')
      .eq('id', storeId)
      .single();

    if (!store) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Store not found',
      });
    }

    // For now, only the owner can access the store
    // Future: RBAC for multi-user stores
    if (store.owner_id !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this store',
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      storeId,
    },
  });
});

export const storeProcedure = protectedProcedure.use(hasStoreAccess);
