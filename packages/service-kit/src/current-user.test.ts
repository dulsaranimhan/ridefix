import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { currentUser } from './current-user';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const USER_ID = '950e8400-e29b-41d4-a716-446655440000';

function sign(claims: object, options: jwt.SignOptions = {}, secret = SECRET) {
  return jwt.sign(claims, secret, {
    algorithm: 'HS256',
    issuer: 'ridefix',
    subject: USER_ID,
    expiresIn: '1h',
    ...options,
  });
}

function buildApp() {
  const app = express();
  app.get('/test', currentUser, (req, res) => {
    res.json({ user: req.user });
  });
  return app;
}

describe('currentUser middleware', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env, JWT_SECRET: SECRET };
    delete process.env.ALLOW_DEV_HEADERS;
  });

  afterAll(() => {
    process.env = env;
  });

  it('sets req.user from a valid Bearer token', async () => {
    const res = await request(buildApp())
      .get('/test')
      .set('Authorization', `Bearer ${sign({ role: 'driver' })}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: USER_ID, role: 'driver' });
  });

  it('returns 401 when no token is sent', async () => {
    const res = await request(buildApp()).get('/test');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('missing_token');
  });

  it.each([
    ['signed with another secret', () => sign({ role: 'driver' }, {}, 'x'.repeat(40))],
    ['from another issuer', () => sign({ role: 'driver' }, { issuer: 'someone-else' })],
    ['expired', () => sign({ role: 'driver' }, { expiresIn: -10 })],
    ['with an unknown role', () => sign({ role: 'superadmin' })],
    ['that is not a JWT', () => 'not-a-token'],
  ])('returns 401 for a token %s', async (_label, makeToken) => {
    const res = await request(buildApp())
      .get('/test')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_token');
  });

  it('returns 401 for a non-Bearer Authorization header', async () => {
    const res = await request(buildApp()).get('/test').set('Authorization', 'Basic abc');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_token');
  });

  it('returns 500 when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;

    const res = await request(buildApp())
      .get('/test')
      .set('Authorization', `Bearer ${sign({ role: 'driver' })}`);

    expect(res.status).toBe(500);
  });

  it('ignores X-User-Id headers unless ALLOW_DEV_HEADERS=true', async () => {
    const res = await request(buildApp())
      .get('/test')
      .set('X-User-Id', 'driver1')
      .set('X-User-Role', 'driver');

    expect(res.status).toBe(401);
  });

  it('accepts X-User-Id headers when ALLOW_DEV_HEADERS=true', async () => {
    process.env.ALLOW_DEV_HEADERS = 'true';

    const res = await request(buildApp())
      .get('/test')
      .set('X-User-Id', 'driver1')
      .set('X-User-Role', 'driver');

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 'driver1', role: 'driver' });
  });

  it('prefers a bad token over dev headers', async () => {
    process.env.ALLOW_DEV_HEADERS = 'true';

    const res = await request(buildApp())
      .get('/test')
      .set('Authorization', 'Bearer not-a-token')
      .set('X-User-Id', 'driver1')
      .set('X-User-Role', 'driver');

    expect(res.status).toBe(401);
  });
});
