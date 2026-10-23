import request from 'supertest';
import { createServiceApp, HttpError } from './create-app';

describe('createServiceApp', () => {
  const app = createServiceApp({ name: 'test-service' }, (a) => {
    a.get('/boom', () => {
      throw new HttpError(409, 'conflict', 'Already exists');
    });
  });

  it('answers GET /health with the service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'test-service' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('turns HttpError into its status and code', async () => {
    const res = await request(app).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'conflict', message: 'Already exists' });
  });
});
