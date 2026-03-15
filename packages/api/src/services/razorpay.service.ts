import Razorpay from 'razorpay';
import { validatePaymentVerification, validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils.js';

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
      return validatePaymentVerification(
        { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
        razorpaySignature,
        this.keySecret,
      );
    } catch {
      return false;
    }
  }

  verifyWebhookSignature(body: string, signature: string, webhookSecret: string): boolean {
    try {
      return validateWebhookSignature(body, signature, webhookSecret);
    } catch {
      return false;
    }
  }
}
