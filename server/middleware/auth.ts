import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { AccountUser, type IAccountUser } from '../models/AccountUser.js';

export interface AuthenticatedRequest extends Request {
  accountUser: IAccountUser;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header.' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);
    const accountUser = await AccountUser.findById(payload.sub).select(
      '-passwordHash -resetPasswordToken -resetPasswordExpires',
    );

    if (!accountUser) {
      res.status(401).json({ error: 'Account not found.' });
      return;
    }

    (req as AuthenticatedRequest).accountUser = accountUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
