import jwt from 'jsonwebtoken';

export type UserRole = 'driver' | 'provider' | 'admin';

/** Kong's jwt plugin finds the signing secret by this `iss` value (its consumer key). */
export const JWT_ISSUER = 'ridefix';
export const TOKEN_LIFETIME = '24h';
const MIN_SECRET_LENGTH = 32;

export interface TokenClaims {
  sub: string;
  role: UserRole;
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'driver' || value === 'provider' || value === 'admin';
}

/** Reads JWT_SECRET. Throws at startup when it is missing or too short to be safe. */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`);
  }
  return secret;
}

export function signToken(user: { id: string; role: UserRole }): string {
  return jwt.sign({ role: user.role }, jwtSecret(), {
    algorithm: 'HS256',
    issuer: JWT_ISSUER,
    subject: user.id,
    expiresIn: TOKEN_LIFETIME,
  });
}

/** Returns the claims of a valid, unexpired RideFix token, or null for anything else. */
export function verifyToken(token: string): TokenClaims | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    if (!isUserRole(payload.role)) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
