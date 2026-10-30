import express from 'express';
import request from 'supertest';
import { currentUser } from './current-user';

describe('currentUser middleware', () => {
  it('attaches the user to the request when headers are valid', async () => {
    const app = express();

    app.get('/test', currentUser, (req, res) => {
      res.json({ user: req.user });
    });

    const response = await request(app)
      .get('/test')
      .set('X-User-Id', 'driver1')
      .set('X-User-Role', 'driver');

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: 'driver1',
      role: 'driver',
    });
  });

  it('returns 401 when user headers are missing', async () => {
    const app = express();

    app.get('/test', currentUser, (_req, res) => {
      res.sendStatus(200);
    });

    const response = await request(app).get('/test');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Missing user ID or role',
    });
  });

  it('returns 401 when the user role is invalid', async () => {
    const app = express();

    app.get('/test', currentUser, (_req, res) => {
      res.sendStatus(200);
    });

    const response = await request(app)
      .get('/test')
      .set('X-User-Id', 'driver1')
      .set('X-User-Role', 'superadmin');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Invalid user role',
    });
  });
});
