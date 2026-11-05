import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, HttpError } from '@ridefix/service-kit';

export const SERVICE_NAME = 'payment-service';

type CheckoutBody = {
  orderId?: unknown;
  amount?: unknown;
  currency?: unknown;
  customer?: unknown;
  description?: unknown;
};

type Notification = {
  merchantId?: unknown;
  orderId?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  hash?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function field(customer: Record<string, unknown>, key: string): string | undefined {
  const value = customer[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hash(values: string[]): string {
  return createHash('md5').update(values.join('')).digest('hex');
}

function matchesHash(expected: string, received: unknown): boolean {
  if (typeof received !== 'string' || !/^[a-f\d]{32}$/i.test(received)) return false;
  const expectedBytes = Buffer.from(expected, 'hex');
  const receivedBytes = Buffer.from(received.toLowerCase(), 'hex');
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  );
}

function hasValidInternalKey(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
  );
}

function isValidOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isValidAmount(value: unknown): value is string {
  return (
    typeof value === 'string' && /^(?:0|[1-9]\d{0,7})\.\d{2}$/.test(value) && Number(value) > 0
  );
}

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    app.post('/payments/checkout', (req, res, next) => {
      const internalKey = process.env.PAYMENT_INTERNAL_API_KEY;
      if (!internalKey) {
        next(
          new HttpError(
            503,
            'payment_provider_not_configured',
            'Payment checkout is not configured',
          ),
        );
        return;
      }
      if (!hasValidInternalKey(req.header('x-ridefix-internal-key'), internalKey)) {
        next(
          new HttpError(401, 'unauthorized', 'A valid internal payment-service key is required'),
        );
        return;
      }

      if (!isRecord(req.body)) {
        next(new HttpError(400, 'invalid_checkout_body', 'A JSON object body is required'));
        return;
      }
      const body = req.body as CheckoutBody;
      if (!isRecord(body.customer)) {
        next(new HttpError(400, 'invalid_customer', 'customer must be a JSON object'));
        return;
      }
      const customerData = body.customer;
      const merchantId = process.env.EPAY_MERCHANT_ID;
      const appSecret = process.env.EPAY_APP_SECRET;
      const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
      const amount = typeof body.amount === 'string' ? body.amount.trim() : '';
      const currency =
        typeof body.currency === 'string'
          ? body.currency.trim().toUpperCase()
          : (process.env.PAYMENT_CURRENCY || 'LKR').toUpperCase();
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const customer = {
        name: field(customerData, 'name'),
        email: field(customerData, 'email'),
        phone: field(customerData, 'phone'),
        address: field(customerData, 'address'),
        city: field(customerData, 'city'),
        state: field(customerData, 'state'),
        zip: field(customerData, 'zip'),
        country: field(customerData, 'country') ?? 'LK',
      };

      if (!merchantId || !appSecret) {
        next(
          new HttpError(
            503,
            'payment_provider_not_configured',
            'ePay credentials are not configured',
          ),
        );
        return;
      }
      if (!isValidOrderId(orderId) || !isValidAmount(amount) || !/^[A-Z]{3}$/.test(currency)) {
        next(
          new HttpError(
            400,
            'invalid_payment',
            'Provide a valid orderId, positive amount with two decimal places, and currency',
          ),
        );
        return;
      }
      if (Object.values(customer).some((value) => !value)) {
        next(
          new HttpError(
            400,
            'invalid_customer',
            'Provide name, email, phone, address, city, state and zip in customer',
          ),
        );
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email!)) {
        next(new HttpError(400, 'invalid_customer_email', 'Provide a valid customer email'));
        return;
      }

      const notifyUrl = process.env.EPAY_NOTIFY_URL;
      const returnUrl = process.env.EPAY_RETURN_URL;
      const cancelUrl = process.env.EPAY_CANCEL_URL;
      if (!notifyUrl || !returnUrl || !cancelUrl) {
        next(
          new HttpError(
            503,
            'payment_provider_not_configured',
            'ePay callback URLs are not configured',
          ),
        );
        return;
      }

      // No authoritative order/amount API or payment persistence contract exists yet.
      // Do not create a checkout from caller-supplied amounts until that source is defined.
      next(
        new HttpError(
          503,
          'payment_order_authority_unavailable',
          'Checkout is unavailable until an authoritative order and amount source is integrated',
        ),
      );
    });

    app.post('/payments/epay/notify', (req, res, next) => {
      if (!isRecord(req.body)) {
        next(new HttpError(400, 'invalid_payment_notification', 'A JSON object body is required'));
        return;
      }
      const notification = req.body as Notification;
      const { merchantId, orderId, amount, currency, status, hash: receivedHash } = notification;
      const configuredMerchantId = process.env.EPAY_MERCHANT_ID;
      const appSecret = process.env.EPAY_APP_SECRET;
      if (!configuredMerchantId || !appSecret) {
        next(
          new HttpError(
            503,
            'payment_provider_not_configured',
            'ePay credentials are not configured',
          ),
        );
        return;
      }

      if (
        merchantId !== configuredMerchantId ||
        !isValidOrderId(orderId) ||
        !isValidAmount(amount) ||
        typeof currency !== 'string' ||
        !/^[A-Z]{3}$/.test(currency) ||
        (status !== 'SUCCESS' && status !== 'FAILURE') ||
        !matchesHash(hash([merchantId, orderId, amount, currency, status, appSecret]), receivedHash)
      ) {
        next(new HttpError(400, 'invalid_payment_notification', 'ePay notification is invalid'));
        return;
      }

      // Do not acknowledge a valid notification until its payment can be persisted idempotently.
      // Booking confirmation also requires a Request Service contract that does not exist yet.
      next(
        new HttpError(
          503,
          'payment_persistence_unavailable',
          'Payment notification cannot be acknowledged until persistence and idempotency are implemented',
        ),
      );
    });

    app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (isRecord(error) && error.type === 'entity.parse.failed') {
        res.status(400).json({
          error: { code: 'invalid_json', message: 'Request body must be valid JSON' },
        });
        return;
      }
      next(error);
    });
  });
}
