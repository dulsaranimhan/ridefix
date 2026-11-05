
import type { Request, Response, NextFunction } from 'express';

export type UserRole = 'driver' | 'provider' | 'admin';

export interface CurrentUser {
  id: string;
  role: UserRole;
}

function isUserRole(role: string): role is UserRole {
  return (
    role === 'driver' ||
    role === 'provider' ||
    role === 'admin'
  );
}

export function currentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = req.header('x-user-id');
  const userRole = req.header('x-user-role');

  if (!userId || !userRole) {
    res.status(401).json({
      message: 'Missing user ID or role',
    });
    return;
  }

  if (!isUserRole(userRole)) {
    res.status(401).json({
      message: 'Invalid user role',
    });
    return;
  }

  req.user = {
    id: userId,
    role: userRole,
  };

  next();
}
