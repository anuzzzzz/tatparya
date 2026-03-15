import { Resend } from 'resend';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function paymentLabel(method: string): string {
  const labels: Record<string, string> = {
    cod: 'Cash on Delivery',
    upi: 'UPI',
    card: 'Credit / Debit Card',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
  };
  return labels[method] ?? method;
}

const BASE_STYLES = `
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  table { border-collapse: collapse; }
`;

// ─── HTML builders ───────────────────────────────────────────────────────────

function emailWrapper(storeName: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${BASE_STYLES}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
      <!-- Header bar -->
      <tr><td style="background:${accentColor};padding:20px 32px;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${storeName}</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        ${body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
        <span style="color:#71717a;font-size:12px;">© ${new Date().getFullYear()} ${storeName}. All rights reserved.</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildOrderConfirmationHtml(params: OrderConfirmationParams): string {
  const itemRows = params.lineItems.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;">${item.name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f4f4f5;font-size:14px;color:#52525b;text-align:center;">× ${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#18181b;text-align:right;">${fmt(item.totalPrice)}</td>
    </tr>`).join('');

  const discountRow = params.discountAmount > 0 ? `
    <tr>
      <td colspan="2" style="padding:6px 0;font-size:13px;color:#52525b;">Discount</td>
      <td style="padding:6px 0;font-size:13px;color:#16a34a;text-align:right;">− ${fmt(params.discountAmount)}</td>
    </tr>` : '';

  const taxRow = params.taxAmount > 0 ? `
    <tr>
      <td colspan="2" style="padding:6px 0;font-size:13px;color:#52525b;">Tax</td>
      <td style="padding:6px 0;font-size:13px;color:#52525b;text-align:right;">${fmt(params.taxAmount)}</td>
    </tr>` : '';

  const shippingRow = params.shippingCost > 0 ? `
    <tr>
      <td colspan="2" style="padding:6px 0;font-size:13px;color:#52525b;">Shipping</td>
      <td style="padding:6px 0;font-size:13px;color:#52525b;text-align:right;">${fmt(params.shippingCost)}</td>
    </tr>` : '';

  const addr = params.shippingAddress;
  const addrLine = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#18181b;">Order Confirmed!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Hi ${params.buyerName}, your order has been confirmed and is being prepared.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#f9f9fa;border-radius:6px;padding:12px 16px;">
      <tr>
        <td style="font-size:13px;color:#71717a;">Order number</td>
        <td style="font-size:14px;font-weight:600;color:#18181b;text-align:right;">${params.orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-top:4px;">Payment</td>
        <td style="font-size:14px;color:#18181b;text-align:right;padding-top:4px;">${paymentLabel(params.paymentMethod)}</td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#18181b;">Items ordered</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemRows}
      <tr><td colspan="3" style="padding-top:12px;"></td></tr>
      <tr>
        <td colspan="2" style="padding:6px 0;font-size:13px;color:#52525b;">Subtotal</td>
        <td style="padding:6px 0;font-size:13px;color:#52525b;text-align:right;">${fmt(params.subtotal)}</td>
      </tr>
      ${discountRow}
      ${taxRow}
      ${shippingRow}
      <tr>
        <td colspan="2" style="padding:10px 0 4px;font-size:15px;font-weight:700;color:#18181b;border-top:2px solid #e4e4e7;">Total</td>
        <td style="padding:10px 0 4px;font-size:15px;font-weight:700;color:#18181b;text-align:right;border-top:2px solid #e4e4e7;">${fmt(params.total)}</td>
      </tr>
    </table>

    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#18181b;">Shipping to</p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">${addr.name}<br/>${addrLine}<br/>📞 ${addr.phone}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
      <tr><td align="center">
        <a href="${params.storeUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">Continue Shopping</a>
      </td></tr>
    </table>`;

  return emailWrapper(params.storeName, '#18181b', body);
}

function buildShippingUpdateHtml(params: ShippingUpdateParams): string {
  const trackingBlock = (params.trackingNumber || params.trackingUrl) ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f0fdf4;border-radius:6px;padding:16px;">
      ${params.trackingNumber ? `<tr><td style="font-size:13px;color:#166534;padding-bottom:4px;">Tracking number</td></tr><tr><td style="font-size:16px;font-weight:700;color:#15803d;font-family:monospace;letter-spacing:1px;">${params.trackingNumber}</td></tr>` : ''}
      ${params.trackingUrl ? `<tr><td style="padding-top:12px;"><a href="${params.trackingUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;">Track Your Package</a></td></tr>` : ''}
    </table>` : '';

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#18181b;">Your order is on its way!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Hi ${params.buyerName}, great news — your order <strong>${params.orderNumber}</strong> has been shipped.</p>
    ${trackingBlock}
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;">If you have any questions, feel free to contact us through our store.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${params.storeUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">Visit Store</a>
      </td></tr>
    </table>`;

  return emailWrapper(params.storeName, '#16a34a', body);
}

function buildNewOrderHtml(params: NewOrderNotificationParams): string {
  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#18181b;">🎉 New Order!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Hi ${params.sellerName}, you have a new order on <strong>${params.storeName}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#fafafa;border-radius:6px;padding:16px;">
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Order</td>
        <td style="font-size:14px;font-weight:700;color:#18181b;text-align:right;padding-bottom:8px;">${params.orderNumber}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Customer</td>
        <td style="font-size:14px;color:#18181b;text-align:right;padding-bottom:8px;">${params.buyerName} · ${params.buyerPhone}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Items</td>
        <td style="font-size:14px;color:#18181b;text-align:right;padding-bottom:8px;">${params.itemCount} item${params.itemCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Payment</td>
        <td style="font-size:14px;color:#18181b;text-align:right;padding-bottom:8px;">${paymentLabel(params.paymentMethod)}</td>
      </tr>
      <tr>
        <td style="font-size:15px;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;padding-top:8px;">Total</td>
        <td style="font-size:15px;font-weight:700;color:#18181b;text-align:right;border-top:1px solid #e4e4e7;padding-top:8px;">${fmt(params.total)}</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${params.dashboardUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">View Order in Dashboard</a>
      </td></tr>
    </table>`;

  return emailWrapper(params.storeName, '#3b82f6', body);
}

// ─── Param types ─────────────────────────────────────────────────────────────

export interface OrderConfirmationParams {
  to: string;
  buyerName: string;
  orderNumber: string;
  lineItems: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number; imageUrl?: string }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  shippingAddress: { name: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };
  storeName: string;
  storeUrl: string;
}

export interface ShippingUpdateParams {
  to: string;
  buyerName: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingUrl?: string;
  storeName: string;
  storeUrl: string;
}

export interface NewOrderNotificationParams {
  to: string;
  sellerName: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
  storeName: string;
  dashboardUrl: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendOrderConfirmation(params: OrderConfirmationParams): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: `${params.storeName} <${this.fromEmail}>`,
        to: params.to,
        subject: `Order Confirmed — ${params.orderNumber} | ${params.storeName}`,
        html: buildOrderConfirmationHtml(params),
      });
      return { success: true };
    } catch (err: any) {
      console.error('sendOrderConfirmation failed:', err?.message);
      return { success: false, error: err?.message };
    }
  }

  async sendShippingUpdate(params: ShippingUpdateParams): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: `${params.storeName} <${this.fromEmail}>`,
        to: params.to,
        subject: `Your Order is on its Way! — ${params.orderNumber} | ${params.storeName}`,
        html: buildShippingUpdateHtml(params),
      });
      return { success: true };
    } catch (err: any) {
      console.error('sendShippingUpdate failed:', err?.message);
      return { success: false, error: err?.message };
    }
  }

  async sendNewOrderNotification(params: NewOrderNotificationParams): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: `${params.storeName} <${this.fromEmail}>`,
        to: params.to,
        subject: `New Order! ${params.orderNumber} — ${fmt(params.total)}`,
        html: buildNewOrderHtml(params),
      });
      return { success: true };
    } catch (err: any) {
      console.error('sendNewOrderNotification failed:', err?.message);
      return { success: false, error: err?.message };
    }
  }
}
