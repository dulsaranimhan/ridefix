import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';
import { pool } from './db';

// Mock PostgreSQL database
jest.mock('./db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

const validBid = {
  requestId: '550e8400-e29b-41d4-a716-446655440000',
  providerId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  price: 2500,
  estimatedTimeMinutes: 30,
};

describe(SERVICE_NAME, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Health endpoint
  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: SERVICE_NAME,
    });
  });

  // Test 2: Successful bid submission
  it('POST /bids submits a valid bid', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'c76036bf-1234-4567-8901-123456789012',
          ...validBid,
          status: 'Pending',
        },
      ],
    });

    const res = await request(buildApp())
      .post('/bids')
      .send(validBid);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Bid submitted successfully');
    expect(res.body.bid.status).toBe('Pending');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  // Test 3: Duplicate bid submission
  it('POST /bids rejects duplicate bids', async () => {
    mockQuery.mockRejectedValueOnce({
      code: '23505',
    });

    const res = await request(buildApp())
      .post('/bids')
      .send(validBid);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      'You have already submitted a bid for this request'
    );
  });

  // Test 4: Invalid price
  it('POST /bids rejects negative prices', async () => {
    const res = await request(buildApp())
      .post('/bids')
      .send({
        ...validBid,
        price: -100,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Price must be a positive number'
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // Test 5: Invalid estimated time
  it('POST /bids rejects zero estimated time', async () => {
    const res = await request(buildApp())
      .post('/bids')
      .send({
        ...validBid,
        estimatedTimeMinutes: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Estimated time must be a positive integer'
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // Test 6: Invalid UUID
  it('POST /bids rejects invalid UUID values', async () => {
    const res = await request(buildApp())
      .post('/bids')
      .send({
        ...validBid,
        requestId: 'invalid-request-id',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Invalid requestId or providerId'
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });
});