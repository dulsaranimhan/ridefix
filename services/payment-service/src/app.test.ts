import { createHash } from 'node:crypto';
import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

const TEST_ENV = [
  'PAYMENT_INTERNAL_API_KEY',
  'EPAY_MERCHANT_ID',
  'EPAY_APP_SECRET',
  'EPAY_NOTIFY_URL',
  'EPAY_RETURN_URL',
  'EPAY_CANCEL_URL',
  'PAYMENT_CURRENCY',
] as const;

const originalEnv = Object.fromEntries(TEST_ENV.map((key) => [key, process.env[key]]));

const checkoutBody = {
  orderId: 'ridefix-order-123',
  amount: '1250.00',
  currency: 'LKR',
  customer: {
    name: 'Test Driver',
    email: 'driver@example.test',
    phone: '0771234567',
    address: '1 Test Road',
    city: 'Colombo',
    state: 'Western',
    zip: '00100',
    country: 'LK',
  },
};

function signedNotification(overrides: Record<string, unknown> = {}) {
  const notification = {
    merchantId: process.env.EPAY_MERCHANT_ID,
    orderId: 'ridefix-order-123',
    amount: '1250.00',
    currency: 'LKR',
    status: 'SUCCESS',
    ...overrides,
  };
  const hash = createHash('md5')
    .update(
      `${notification.merchantId}${notification.orderId}${notification.amount}${notification.currency}${notification.status}${process.env.EPAY_APP_SECRET}`,
    )
    .digest('hex');
  return { ...notification, hash };
}

describe(SERVICE_NAME, () => {
  beforeEach(() => {
    process.env.PAYMENT_INTERNAL_API_KEY = 'test-only-internal-key';
    process.env.EPAY_MERCHANT_ID = 'test-merchant';
    process.env.EPAY_APP_SECRET = 'test-only-app-secret';
    process.env.EPAY_NOTIFY_URL = 'https://payments.example.test/notify';
    process.env.EPAY_RETURN_URL = 'ridefix://payment/return';
    process.env.EPAY_CANCEL_URL = 'ridefix://payment/cancel';
    process.env.PAYMENT_CURRENCY = 'LKR';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of TEST_ENV) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: SERVICE_NAME });
  });

  it('returns 503 when the internal API key is not configured', async () => {
    delete process.env.PAYMENT_INTERNAL_API_KEY;

    const res = await request(buildApp()).post('/payments/checkout').send(checkoutBody);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('payment_provider_not_configured');
  });

  it('rejects a missing or incorrect internal API key', async () => {
    const res = await request(buildApp())
      .post('/payments/checkout')
      .set('x-ridefix-internal-key', 'incorrect-key')
      .send(checkoutBody);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it.each([null, [], 'not an object', 12])(
    'rejects non-object checkout bodies (%p)',
    async (body) => {
      const res = await request(buildApp())
        .post('/payments/checkout')
        .set('x-ridefix-internal-key', 'test-only-internal-key')
        .set('content-type', 'application/json')
        .send(JSON.stringify(body));

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    },
  );

  it('rejects a malformed checkout JSON body with 400', async () => {
    const res = await request(buildApp())
      .post('/payments/checkout')
      .set('x-ridefix-internal-key', 'test-only-internal-key')
      .set('content-type', 'application/json')
      .send('{"orderId":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });

  it('rejects missing or non-object customer data', async () => {
    const res = await request(buildApp())
      .post('/payments/checkout')
      .set('x-ridefix-internal-key', 'test-only-internal-key')
      .send({ ...checkoutBody, customer: null });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_customer');
  });

  it.each(['0.00', '-1.00', '1.0', '1e2', 1250])(
    'rejects a malformed or non-positive checkout amount (%p)',
    async (amount) => {
      const res = await request(buildApp())
        .post('/payments/checkout')
        .set('x-ridefix-internal-key', 'test-only-internal-key')
        .send({ ...checkoutBody, amount });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_payment');
    },
  );

  it('does not generate checkout HTML from caller-supplied order and amount', async () => {
    const res = await request(buildApp())
      .post('/payments/checkout')
      .set('x-ridefix-internal-key', 'test-only-internal-key')
      .send(checkoutBody);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('payment_order_authority_unavailable');
    expect(res.text).not.toContain('<form');
  });

  it('returns 400 for a notification with an invalid signature', async () => {
    const res = await request(buildApp())
      .post('/payments/epay/notify')
      .send({ ...signedNotification(), hash: '0'.repeat(32) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_payment_notification');
  });

  it.each([null, [], 'not an object'])('rejects non-object notifications (%p)', async (body) => {
    const res = await request(buildApp())
      .post('/payments/epay/notify')
      .set('content-type', 'application/json')
      .send(JSON.stringify(body));

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for malformed notification JSON', async () => {
    const res = await request(buildApp())
      .post('/payments/epay/notify')
      .set('content-type', 'application/json')
      .send('{"merchantId":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });

  it.each([
    { merchantId: 'wrong-merchant' },
    { orderId: '../other-order' },
    { amount: '0.00' },
    { currency: 'bad' },
    { status: 'PENDING' },
  ])('rejects invalid notification fields (%p)', async (override) => {
    const res = await request(buildApp())
      .post('/payments/epay/notify')
      .send(signedNotification(override));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_payment_notification');
  });

  it('does not acknowledge a valid notification before persistence is available', async () => {
    const res = await request(buildApp()).post('/payments/epay/notify').send(signedNotification());

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('payment_persistence_unavailable');
  });

  it('does not falsely treat repeated valid notifications as processed duplicates', async () => {
    const notification = signedNotification();
    const first = await request(buildApp()).post('/payments/epay/notify').send(notification);
    const duplicate = await request(buildApp()).post('/payments/epay/notify').send(notification);

    expect(first.status).toBe(503);
    expect(duplicate.status).toBe(503);
    expect(first.body.error.code).toBe('payment_persistence_unavailable');
    expect(duplicate.body.error.code).toBe('payment_persistence_unavailable');
  });
});
