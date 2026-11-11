import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

jest.mock('./db', () => ({
  pool: { query: jest.fn() },
}));

import { buildApp, SERVICE_NAME } from './app';
import { pool } from './db';
import { signToken, verifyToken } from './tokens';

const mockQuery = pool.query as jest.Mock;

const USER_ID = '950e8400-e29b-41d4-a716-446655440000';
const PASSWORD = 'correct-horse-9';

const driver = {
  id: USER_ID,
  email: 'kasun@example.com',
  fullName: 'Kasun Perera',
  role: 'driver',
  status: 'active',
  createdAt: '2026-11-10T09:00:00.000Z',
};

const validRegister = {
  email: '  Kasun@Example.com ',
  password: PASSWORD,
  fullName: ' Kasun Perera ',
  role: 'driver',
};

let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe(`${SERVICE_NAME} POST /auth/register`, () => {
  it('creates a driver, hashes the password and returns a token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [driver] });

    const res = await request(buildApp()).post('/auth/register').send(validRegister);

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(driver);
    expect(verifyToken(res.body.token)).toEqual({ sub: USER_ID, role: 'driver' });

    const [, values] = mockQuery.mock.calls[0] as [string, string[]];
    expect(values[0]).toBe('kasun@example.com');
    expect(values[1]).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, values[1] as string)).toBe(true);
    expect(values[2]).toBe('Kasun Perera');
  });

  it('returns 409 when the email is already used', async () => {
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));

    const res = await request(buildApp()).post('/auth/register').send(validRegister);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_taken');
  });

  it.each([
    ['admin role', { role: 'admin' }, 'invalid_role'],
    ['short password', { password: 'short' }, 'invalid_password'],
    ['password over 72 bytes', { password: 'x'.repeat(73) }, 'invalid_password'],
    ['bad email', { email: 'not-an-email' }, 'invalid_email'],
    ['empty name', { fullName: '   ' }, 'invalid_full_name'],
  ])('rejects %s with 400', async (_label, change, code) => {
    const res = await request(buildApp())
      .post('/auth/register')
      .send({ ...validRegister, ...change });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe(`${SERVICE_NAME} POST /auth/login`, () => {
  it('returns a token and the user without the password hash', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...driver, passwordHash }] });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'KASUN@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(driver);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(verifyToken(res.body.token)).toEqual({ sub: USER_ID, role: 'driver' });
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['kasun@example.com']);
  });

  it('returns 401 for a wrong password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...driver, passwordHash }] });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: driver.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_credentials');
  });

  it('returns the same 401 for an unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_credentials');
  });

  it('returns 403 for a blocked account with the right password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...driver, status: 'blocked', passwordHash }] });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: driver.email, password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('account_blocked');
    expect(res.body.token).toBeUndefined();
  });

  it('returns 400 when email or password is missing', async () => {
    const res = await request(buildApp()).post('/auth/login').send({ email: driver.email });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe(`${SERVICE_NAME} GET /auth/me`, () => {
  it('returns the signed-in user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [driver] });

    const res = await request(buildApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${signToken({ id: USER_ID, role: 'driver' })}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(driver);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([USER_ID]);
  });

  it('returns 401 without a token', async () => {
    const res = await request(buildApp()).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('missing_token');
  });

  it.each([
    ['signed with another secret', jwt.sign({ role: 'driver' }, 'x'.repeat(40), { issuer: 'ridefix', subject: USER_ID })],
    ['from another issuer', jwt.sign({ role: 'driver' }, process.env.JWT_SECRET as string, { issuer: 'someone-else', subject: USER_ID })],
    ['expired', jwt.sign({ role: 'driver' }, process.env.JWT_SECRET as string, { issuer: 'ridefix', subject: USER_ID, expiresIn: -10 })],
  ])('returns 401 for a token %s', async (_label, token) => {
    const res = await request(buildApp()).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_token');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 403 when the account was blocked after login', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...driver, status: 'blocked' }] });

    const res = await request(buildApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${signToken({ id: USER_ID, role: 'driver' })}`);

    expect(res.status).toBe(403);
  });
});
