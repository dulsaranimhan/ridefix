import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type UserRole = 'driver' | 'provider' | 'admin';

export interface CurrentUser {
  id: string;
  role: UserRole;
}

/** Must match the issuer auth-service signs with (and Kong's consumer key). */
export const JWT_ISSUER = 'ridefix';

function isUserRole(role: unknown): role is UserRole {
  return role === 'driver' || role === 'provider' || role === 'admin';
}

function reject(res: Response, code: string, message: string) {
  res.status(401).json({ error: { code, message } });
}

/** Returns the user in a valid, unexpired RideFix token, or null for anything else. */
export function verifyUserToken(token: string, secret: string): CurrentUser | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: JWT_ISSUER });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    if (!isUserRole(payload.role)) return null;
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * Express middleware that sets `req.user` from `Authorization: Bearer <token>`.
 * The token is the JWT auth-service returns from /auth/login or /auth/register, checked with
 * JWT_SECRET. Kong will also check it at the gateway, but each service checks it again so a
 * request that skips Kong cannot pretend to be someone else.
 *
 * Transition only: when ALLOW_DEV_HEADERS=true and no token is sent, the old X-User-Id and
 * X-User-Role headers are still accepted. Remove this once every app sends tokens.
 */
export function currentUser(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');

  if (authorization) {
    const match = /^Bearer (.+)$/.exec(authorization);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: { code: 'auth_not_configured', message: 'JWT_SECRET is not set' } });
      return;
    }
    const user = match?.[1] ? verifyUserToken(match[1], secret) : null;
    if (!user) {
      reject(res, 'invalid_token', 'Token is invalid or expired');
      return;
    }
    req.user = user;
    next();
    return;
  }

  if (process.env.ALLOW_DEV_HEADERS === 'true') {
    const userId = req.header('x-user-id');
    const userRole = req.header('x-user-role');
    if (userId && isUserRole(userRole)) {
      req.user = { id: userId, role: userRole };
      next();
      return;
    }
  }

  reject(res, 'missing_token', 'Authorization: Bearer <token> is required');
}
