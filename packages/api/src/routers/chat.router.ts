import { z } from 'zod';
import { router, publicProcedure } from '../trpc/trpc.js';
import {
  type TatparyaAction,
  DESTRUCTIVE_ACTIONS,
} from '@tatparya/shared';
import { buildStoreSnapshot } from '../services/store-snapshot.service.js';
import { classifyAndAct } from '../services/chat-llm.service.js';
import { validateAction } from '../services/action-validators.js';
import { executeActions } from '../services/action-executor.js';

// ============================================================
// Chat Router
//
// Single entry point for all seller chat messages.
// Orchestrates: snapshot → Haiku LLM → validate → execute → respond
//
// Uses publicProcedure for now (matching devCreate pattern).
// Switch to protectedProcedure + storeProcedure for production.
// ============================================================

const ConversationTurnSchema = z.object({
  role: z.enum(['seller', 'ai']),
  content: z.string(),
  actionsTaken: z.array(z.string()).optional(),
});

export const chatRouter = router({
  // ============================================================
  // process — the main chat endpoint
  //
  // Client sends: message + history + storeId
  // Server: fetches state → calls Haiku → validates → executes → responds
  // ============================================================
  process: publicProcedure
    .input(z.object({
      storeId: z.string().uuid().optional(),
      message: z.string().min(1).max(2000),
      conversationHistory: z.array(ConversationTurnSchema).max(20).default([]),
      hasPhotos: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // 1. Build store snapshot (if store exists)
      let snapshot = null;
      if (input.storeId) {
        try {
          snapshot = await buildStoreSnapshot(ctx.serviceDb, input.storeId);
        } catch (err: any) {
          console.error('[chat.process] Failed to build snapshot:', err.message);
          // Continue without snapshot — LLM can still handle basic requests
        }
      }

      // 2. Call Claude Haiku
      const llmResult = await classifyAndAct({
        message: input.message,
        conversationHistory: input.conversationHistory,
        storeSnapshot: snapshot,
        hasPhotos: input.hasPhotos,
      });

      // 3. If confirmation needed, return without executing
      if (llmResult.confirmationNeeded) {
        return {
          response: llmResult.response,
          followUp: llmResult.followUp,
          actions: llmResult.actions.map((a) => a.type),
          pendingActions: llmResult.actions,
          executionResults: [],
          validationErrors: [],
          confirmationNeeded: llmResult.confirmationNeeded,
          suggestions: llmResult.suggestions || [],
          queryResults: null,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 4. If follow-up needed (LLM wants more info), return without executing
      if (llmResult.followUp && llmResult.actions.length === 0) {
        return {
          response: llmResult.response,
          followUp: llmResult.followUp,
          actions: [],
          pendingActions: [],
          executionResults: [],
          validationErrors: [],
          confirmationNeeded: null,
          suggestions: llmResult.suggestions || [],
          queryResults: null,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 5. Validate each action
      const validatedActions: TatparyaAction[] = [];
      const validationErrors: string[] = [];

      for (const action of llmResult.actions) {
        const result = validateAction(action, snapshot);
        if (result.valid) {
          validatedActions.push(result.fixed || action);
        } else {
          validationErrors.push(result.error || `Invalid action: ${action.type}`);
        }
      }

      // 6. Execute validated actions
      let executionResults: {
        type: string;
        success: boolean;
        data?: unknown;
        error?: string;
      }[] = [];

      if (validatedActions.length > 0 && input.storeId) {
        const results = await executeActions(validatedActions, input.storeId, ctx.serviceDb);
        executionResults = results.map((r) => ({
          type: r.action.type,
          success: r.success,
          data: r.data,
          error: r.error,
        }));
      }

      // 7. Collect query results (for query.* actions) to render rich cards on the client
      const queryResults = executionResults
        .filter((r) => r.type.startsWith('query.') && r.success && r.data)
        .map((r) => ({ type: r.type, data: r.data }));

      // 8. Append execution errors to response if any
      let finalResponse = llmResult.response;
      const executionErrors = executionResults.filter((r) => !r.success);
      if (executionErrors.length > 0 && validatedActions.length > executionErrors.length) {
        // Partial success
        finalResponse += ` (${executionErrors.length} action${executionErrors.length > 1 ? 's' : ''} failed)`;
      } else if (executionErrors.length > 0 && validatedActions.length === executionErrors.length) {
        // All failed
        finalResponse = `I tried to do that but hit an error: ${executionErrors[0]?.error || 'unknown error'}. Could you try again?`;
      }

      if (validationErrors.length > 0) {
        finalResponse += '\n' + validationErrors.join('\n');
      }

      return {
        response: finalResponse,
        followUp: null,
        actions: validatedActions.map((a) => a.type),
        pendingActions: [],
        executionResults: executionResults.map((r) => ({
          type: r.type,
          success: r.success,
          error: r.error,
        })),
        validationErrors,
        confirmationNeeded: null,
        suggestions: llmResult.suggestions || [],
        queryResults: queryResults.length > 0 ? queryResults : null,
        processingTimeMs: Date.now() - startTime,
      };
    }),

  // ============================================================
  // confirm — execute pending actions after seller confirms
  //
  // Called when the seller confirms a destructive action
  // that was returned with confirmationNeeded in a previous call.
  // ============================================================
  confirm: publicProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      actions: z.array(z.any()).min(1), // TatparyaAction[] — loosely typed at the boundary
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate and execute the confirmed actions
      const snapshot = await buildStoreSnapshot(ctx.serviceDb, input.storeId);
      const validatedActions: TatparyaAction[] = [];
      const validationErrors: string[] = [];

      for (const action of input.actions) {
        const result = validateAction(action as TatparyaAction, snapshot);
        if (result.valid) {
          validatedActions.push((result.fixed || action) as TatparyaAction);
        } else {
          validationErrors.push(result.error || `Invalid action: ${(action as any).type}`);
        }
      }

      const results = await executeActions(validatedActions, input.storeId, ctx.serviceDb);

      const failures = results.filter((r) => !r.success);
      const response = failures.length === 0
        ? 'Done!'
        : `Completed with ${failures.length} error(s): ${failures.map((f) => f.error).join(', ')}`;

      return {
        response,
        executionResults: results.map((r) => ({
          type: r.action.type,
          success: r.success,
          error: r.error,
          data: r.data,
        })),
        validationErrors,
      };
    }),
});
