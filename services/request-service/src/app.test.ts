jest.mock('./db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import request from 'supertest';
import { pool } from './db';
import { buildApp, SERVICE_NAME } from './app';

const mockQuery = pool.query as jest.Mock;

describe(SERVICE_NAME, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: SERVICE_NAME,
    });
  });

  it('POST /requests creates a help request', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          driverId: '22222222-2222-4222-8222-222222222222',
          serviceType: 'Towing',
          description: 'Car breakdown',
          latitude: 6.9271,
          longitude: 79.8612,
          status: 'Open',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const res = await request(buildApp())
      .post('/requests')
      .send({
        driverId: '22222222-2222-4222-8222-222222222222',
        serviceType: 'Towing',
        description: 'Car breakdown',
        location: {
          latitude: 6.9271,
          longitude: 79.8612,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({
      serviceType: 'Towing',
      status: 'Open',
    });
  });

  it('GET /requests returns created requests', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const res = await request(buildApp()).get('/requests');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('rejects invalid coordinates', async () => {
    const res = await request(buildApp())
      .post('/requests')
      .send({
        driverId: '22222222-2222-4222-8222-222222222222',
        serviceType: 'Towing',
        location: {
          latitude: 200,
          longitude: 500,
        },
      });

    expect(res.status).toBe(400);
  });
});