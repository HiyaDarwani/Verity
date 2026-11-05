import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { UserRole } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from '../shared/errors.js';

export interface SessionUser { id: string; name: string; email: string; role: UserRole; active: boolean }
declare global { namespace Express { interface Request { user?: SessionUser; authSessionId?: string } } }

export function signAccessToken(user: SessionUser, sessionId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { algorithm: 'HS256', subject: user.id, jwtid: sessionId, expiresIn: env.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions['expiresIn']> });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  let payload: JwtPayload;
  try {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
    payload = jwt.verify(authorization.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') throw new HttpError(401, 'INVALID_TOKEN', 'Invalid authentication token');
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token'));
  }
  try {
    const session = await prisma.authSession.findUnique({ where: { id: payload.jti! }, include: { user: { select: { id: true, name: true, email: true, role: true, active: true } } } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) throw new HttpError(401, 'INVALID_TOKEN', 'Session is revoked or expired');
    if (!session.user.active) throw new HttpError(401, 'ACCOUNT_INACTIVE', 'Account is unavailable');
    req.authSessionId = session.id;
    req.user = session.user;
    next();
  } catch (error) { next(error); }
}

export function allowRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Authentication required'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
    next();
  };
}
