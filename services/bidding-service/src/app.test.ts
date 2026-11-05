import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

jest.mock('./db', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

import { pool } from './db';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;
const mockFetch = jest.fn();

const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440000';
const PROVIDER_ID = '650e8400-e29b-41d4-a716-446655440000';
const DRIVER_ID = '750e8400-e29b-41d4-a716-446655440000';
const BID_ID = '850e8400-e29b-41d4-a716-446655440000';

const validBid = {
  requestId: REQUEST_ID,
  providerId: PROVIDER_ID,
  providerName: 'AutoFix Garage',
  priceLkr: 3500,
  etaMinutes: 15,
  distanceKm: 2.1,
};

function requestResponse(status = 'Open for bids', driverId = DRIVER_ID) {
  return new Response(
    JSON.stringify({ request: { id: REQUEST_ID, driverId, providerId: null, status } }),
    { status: 200 },
  );
}

function mockTransaction(lockedRows: unknown[]) {
  const client = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: lockedRows };
      if (sql.includes("status = 'Accepted'"))
        return { rows: [{ id: BID_ID, status: 'Accepted' }] };
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  mockConnect.mockResolvedValueOnce(client);
  return client;
}

const lockedBid = {
  id: BID_ID,
  requestId: REQUEST_ID,
  providerId: PROVIDER_ID,
  status: 'Submitted',
  isExpired: false,
};

describe(SERVICE_NAME, () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = mockFetch;
  });

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: SERVICE_NAME });
  });

  describe('POST /bids', () => {
    it('creates a bid on an open request', async () => {
      mockFetch.mockResolvedValueOnce(requestResponse());
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: BID_ID, status: 'Submitted' }] });

      const res = await request(buildApp()).post('/bids').send(validBid);

      expect(res.status).toBe(201);
      expect(res.body.bid.status).toBe('Submitted');
    });

    it('rejects an invalid price before calling anything', async () => {
      const res = await request(buildApp())
        .post('/bids')
        .send({ ...validBid, priceLkr: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_price');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('refuses a request that is not open', async () => {
      mockFetch.mockResolvedValueOnce(requestResponse('Booked'));

      const res = await request(buildApp()).post('/bids').send(validBid);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('request_not_open');
    });

    it('returns 404 for an unknown request', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 404 }));

      const res = await request(buildApp()).post('/bids').send(validBid);

      expect(res.status).toBe(404);
    });

    it('refuses a second open bid from the same provider', async () => {
      mockFetch.mockResolvedValueOnce(requestResponse());
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));

      const res = await request(buildApp()).post('/bids').send(validBid);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('bid_already_submitted');
    });

    it('returns 502 when the Request Service is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('connection refused'));

      const res = await request(buildApp()).post('/bids').send(validBid);

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('request_service_unavailable');
    });
  });

  describe('GET /bids', () => {
    it('requires a filter', async () => {
      const res = await request(buildApp()).get('/bids');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('missing_bid_filter');
    });

    it('lists bids for a request after closing expired ones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: BID_ID }] });

      const res = await request(buildApp()).get(`/bids?requestId=${REQUEST_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.bids).toHaveLength(1);
      expect(mockQuery.mock.calls[0][0]).toContain("status = 'Expired'");
      expect(mockQuery.mock.calls[1][1]).toEqual([REQUEST_ID]);
    });
  });

  describe('POST /bids/:id/accept', () => {
    it('books the request, accepts the bid and rejects the others', async () => {
      const client = mockTransaction([lockedBid]);
      mockFetch.mockResolvedValueOnce(requestResponse());
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/accept`)
        .send({ driverId: DRIVER_ID });

      expect(res.status).toBe(200);
      expect(res.body.bid.status).toBe('Accepted');
      expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ providerId: PROVIDER_ID });
      const sql = client.query.mock.calls.map((call) => call[0] as string);
      expect(sql.some((text) => text.includes("status = 'Rejected'"))).toBe(true);
      expect(sql).toContain('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('refuses another driver', async () => {
      const client = mockTransaction([lockedBid]);
      mockFetch.mockResolvedValueOnce(requestResponse('Open for bids', PROVIDER_ID));

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/accept`)
        .send({ driverId: DRIVER_ID });

      expect(res.status).toBe(403);
      expect(client.query.mock.calls.map((call) => call[0])).toContain('ROLLBACK');
    });

    it('refuses an expired bid', async () => {
      mockTransaction([{ ...lockedBid, isExpired: true }]);

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/accept`)
        .send({ driverId: DRIVER_ID });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('bid_expired');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rolls back when the request was already taken', async () => {
      const client = mockTransaction([lockedBid]);
      mockFetch.mockResolvedValueOnce(requestResponse());
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 409 }));

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/accept`)
        .send({ driverId: DRIVER_ID });

      expect(res.status).toBe(409);
      expect(client.query.mock.calls.map((call) => call[0])).toContain('ROLLBACK');
    });

    it('returns 404 for an unknown bid', async () => {
      mockTransaction([]);

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/accept`)
        .send({ driverId: DRIVER_ID });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /bids/:id/reject and /withdraw', () => {
    it('lets the request owner reject a bid', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ requestId: REQUEST_ID }] });
      mockFetch.mockResolvedValueOnce(requestResponse());
      mockQuery.mockResolvedValueOnce({ rows: [{ id: BID_ID, status: 'Rejected' }] });

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/reject`)
        .send({ driverId: DRIVER_ID });

      expect(res.status).toBe(200);
      expect(res.body.bid.status).toBe('Rejected');
    });

    it('lets the provider withdraw an open bid', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: BID_ID, status: 'Withdrawn' }] });

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/withdraw`)
        .send({ providerId: PROVIDER_ID });

      expect(res.status).toBe(200);
      expect(res.body.bid.status).toBe('Withdrawn');
    });

    it('hides a bid from a different provider', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ providerId: DRIVER_ID }] });

      const res = await request(buildApp())
        .post(`/bids/${BID_ID}/withdraw`)
        .send({ providerId: PROVIDER_ID });

      expect(res.status).toBe(404);
    });
  });
});
