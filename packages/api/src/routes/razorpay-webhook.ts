import type { FastifyInstance } from 'fastify';
import { RazorpayService } from '../services/razorpay.service.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { OrderService } from '../services/order.service.js';
import { VariantRepository } from '../repositories/product.repository.js';
import { DiscountRepository } from '../repositories/discount.repository.js';
import { getServiceClient } from '../lib/db.js';
import { env } from '../env.js';

export async function registerRazorpayWebhook(app: FastifyInstance) {
  await app.register(async function (scope) {
    // Override JSON parser for this scope to get the raw body string
    // (signature verification requires the exact bytes, not re-serialized JSON)
    scope.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
      done(null, body as string);
    });

    scope.post('/webhooks/razorpay', async (request, reply) => {
      const rawBody = request.body as string;
      const signature = request.headers['x-razorpay-signature'] as string | undefined;

      // Always return 200 to prevent Razorpay retries on non-2xx
      if (!signature) {
        request.log.warn('Razorpay webhook: missing signature header');
        return reply.status(200).send({ ok: false, reason: 'missing_signature' });
      }

      const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        request.log.warn('Razorpay webhook: RAZORPAY_WEBHOOK_SECRET not configured');
        return reply.status(200).send({ ok: false, reason: 'not_configured' });
      }

      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        return reply.status(200).send({ ok: false, reason: 'not_configured' });
      }

      const razorpay = new RazorpayService(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
      if (!razorpay.verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        request.log.warn('Razorpay webhook: invalid signature');
        return reply.status(200).send({ ok: false, reason: 'invalid_signature' });
      }

      let payload: any;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return reply.status(200).send({ ok: false, reason: 'invalid_json' });
      }

      const event = payload?.event as string;
      const paymentEntity = payload?.payload?.payment?.entity;

      const db = getServiceClient();
      const orderRepo = new OrderRepository(db);
      const orderService = new OrderService(
        orderRepo,
        new VariantRepository(db),
        new DiscountRepository(db),
      );

      try {
        if (event === 'payment.captured' && paymentEntity) {
          const rzpOrderId: string = paymentEntity.order_id;
          const rzpPaymentId: string = paymentEntity.id;

          // Find order by paymentReference = razorpay order id
          const { data: rows } = await db
            .from('orders')
            .select('id, store_id, status')
            .eq('payment_reference', rzpOrderId)
            .limit(1);

          const row = rows?.[0];
          if (!row) {
            request.log.warn({ rzpOrderId }, 'Razorpay webhook: order not found');
            return reply.status(200).send({ ok: true });
          }

          // Idempotent — skip if already paid
          if (row.status === 'paid' || row.status === 'processing' || row.status === 'delivered') {
            return reply.status(200).send({ ok: true });
          }

          await orderService.updateStatus(row.store_id, row.id, 'paid', {
            paymentStatus: 'captured',
            paymentReference: rzpPaymentId,
          });

          request.log.info({ orderId: row.id, rzpPaymentId }, 'Order marked paid via webhook');
        } else if (event === 'payment.failed' && paymentEntity) {
          const rzpOrderId: string = paymentEntity.order_id;

          const { data: rows } = await db
            .from('orders')
            .select('id, store_id, status')
            .eq('payment_reference', rzpOrderId)
            .limit(1);

          const row = rows?.[0];
          if (!row) return reply.status(200).send({ ok: true });

          // Only cancel if still waiting for payment
          if (row.status === 'payment_pending') {
            await orderService.updateStatus(row.store_id, row.id, 'cancelled', {
              paymentStatus: 'failed',
            });
            request.log.info({ orderId: row.id }, 'Order cancelled via payment.failed webhook');
          }
        }
      } catch (err) {
        request.log.error({ err, event }, 'Razorpay webhook handler error');
      }

      return reply.status(200).send({ ok: true });
    });
  });
}
