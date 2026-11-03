import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

describe(SERVICE_NAME, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: SERVICE_NAME,
    });
  });

  it('returns only Open requests', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: [
          {
            id: 'request-001',
            serviceType: 'Towing',
            status: 'Open',
          },
          {
            id: 'request-002',
            serviceType: 'Battery Repair',
            status: 'Completed',
          },
        ],
      }),
    } as Response);

    const res = await request(buildApp()).get('/matching/requests');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].id).toBe('request-001');
  });

  it('returns 502 when Request Service fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response);

    const res = await request(buildApp()).get('/matching/requests');

    expect(res.status).toBe(502);
  });
});