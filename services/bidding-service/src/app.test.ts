import request from 'supertest';
import { buildApp, SERVICE_NAME } from './app';

describe(SERVICE_NAME, () => {
  it('GET /health returns ok', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: SERVICE_NAME });
  });
});
