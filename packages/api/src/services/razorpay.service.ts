import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';

export class RazorpayService {
  private client: Razorpay;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    this.keySecret = keySecret;
  }

  async createOrder(
    amountInPaise: number,
    currency: string,
    receipt: string,
    notes: Record<string, string>,
  ) {
    const order = await this.client.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });
    return order;
  }

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    try {
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = createHmac('sha256', this.keySecret)
        .update(payload)
        .digest('hex');
      const expectedBuf = Buffer.from(expected, 'utf8');
      const signatureBuf = Buffer.from(razorpaySignature, 'utf8');
      if (expectedBuf.length !== signatureBuf.length) return false;
      return timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      return false;
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
    try {
      const expected = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      const expectedBuf = Buffer.from(expected, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');
      if (expectedBuf.length !== signatureBuf.length) return false;
      return timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      return false;
    }
  }
}
