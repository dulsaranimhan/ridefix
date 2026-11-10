import bcrypt from 'bcryptjs';
import { createServiceApp, HttpError } from '@ridefix/service-kit';
import type { Request } from 'express';
import { pool } from './db';
import { signToken, verifyToken, type UserRole } from './tokens';

export const SERVICE_NAME = 'auth-service';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
/** bcrypt only uses the first 72 bytes of a password, so longer ones are refused. */
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Admins are created with the seed script, never through the public register endpoint. */
const SELF_REGISTER_ROLES: UserRole[] = ['driver', 'provider'];
const UNIQUE_VIOLATION = '23505';

const USER_COLUMNS = `
  id,
  email,
  full_name AS "fullName",
  role,
  status,
  created_at AS "createdAt"`;

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'blocked';
  createdAt: string;
}

/** Compared against when the email is unknown, so both failures take about the same time. */
let dummyHash: string | undefined;
async function compareWithDummy(password: string) {
  dummyHash ??= await bcrypt.hash('ridefix-timing-guard', BCRYPT_ROUNDS);
  await bcrypt.compare(password, dummyHash);
}

function readEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, 'invalid_email', 'A valid email address is required');
  }
  return email;
}

function readNewPassword(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES
  ) {
    throw new HttpError(
      400,
      'invalid_password',
      `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_BYTES} characters`,
    );
  }
  return value;
}

function readFullName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, 'invalid_full_name', `fullName must be 1-${MAX_NAME_LENGTH} characters`);
  }
  return name;
}

function readRegisterRole(value: unknown): UserRole {
  if (!SELF_REGISTER_ROLES.includes(value as UserRole)) {
    throw new HttpError(400, 'invalid_role', 'role must be driver or provider');
  }
  return value as UserRole;
}

function requireActive(user: PublicUser) {
  if (user.status !== 'active') {
    throw new HttpError(403, 'account_blocked', 'This account is blocked');
  }
}

function bearerToken(req: Request): string {
  const match = /^Bearer (.+)$/.exec(req.header('authorization') ?? '');
  if (!match?.[1]) {
    throw new HttpError(401, 'missing_token', 'Authorization: Bearer <token> is required');
  }
  return match[1];
}

export function buildApp() {
  return createServiceApp({ name: SERVICE_NAME }, (app) => {
    app.post('/auth/register', async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const email = readEmail(body.email);
      const password = readNewPassword(body.password);
      const fullName = readFullName(body.fullName);
      const role = readRegisterRole(body.role);
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      let user: PublicUser;
      try {
        const result = await pool.query<PublicUser>(
          `INSERT INTO users (email, password_hash, full_name, role)
           VALUES ($1, $2, $3, $4)
           RETURNING ${USER_COLUMNS}`,
          [email, passwordHash, fullName, role],
        );
        user = result.rows[0] as PublicUser;
      } catch (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
          throw new HttpError(409, 'email_taken', 'An account with this email already exists');
        }
        throw error;
      }

      res.status(201).json({ token: signToken(user), user });
    });

    app.post('/auth/login', async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (typeof body.email !== 'string' || typeof body.password !== 'string') {
        throw new HttpError(400, 'invalid_body', 'email and password are required');
      }
      const email = body.email.trim().toLowerCase();

      const result = await pool.query<PublicUser & { passwordHash: string }>(
        `SELECT ${USER_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
        [email],
      );
      const found = result.rows[0];
      if (!found) {
        await compareWithDummy(body.password);
        throw new HttpError(401, 'invalid_credentials', 'Email or password is incorrect');
      }
      if (!(await bcrypt.compare(body.password, found.passwordHash))) {
        throw new HttpError(401, 'invalid_credentials', 'Email or password is incorrect');
      }

      const { passwordHash: _passwordHash, ...user } = found;
      requireActive(user);
      res.json({ token: signToken(user), user });
    });

    app.get('/auth/me', async (req, res) => {
      const claims = verifyToken(bearerToken(req));
      if (!claims) throw new HttpError(401, 'invalid_token', 'Token is invalid or expired');

      const result = await pool.query<PublicUser>(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
        [claims.sub],
      );
      const user = result.rows[0];
      if (!user) throw new HttpError(401, 'invalid_token', 'Token is invalid or expired');
      requireActive(user);
      res.json({ user });
    });
  });
}
