import type { RequestHandler } from 'express';
import { prisma } from '../db/prisma.js';

const ignoredPaths = new Set(['/health']);
export const auditSuccessfulMutation: RequestHandler = (req, res, next) => {
  res.once('finish', () => {
    if (!req.user || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || res.statusCode >= 400) return;
    const path = req.baseUrl + req.path;
    if (ignoredPaths.has(path)) return;
    const entityType = req.baseUrl.split('/').filter(Boolean).at(-1) ?? 'unknown';
    const lastPathPart = new URL(req.originalUrl, 'http://localhost').pathname.split('/').filter(Boolean).at(-1);
    const entityId = req.params.id ?? req.params.attemptId ?? (lastPathPart && /^[0-9a-f-]{36}$/i.test(lastPathPart) ? lastPathPart : null);
    void prisma.activityLog.create({ data: {
      actorId: req.user.id,
      action: `${req.method} ${req.path}`.slice(0, 120),
      entityType: entityType.slice(0, 80),
      entityId: typeof entityId === 'string' ? entityId : null,
      metadata: { statusCode: res.statusCode },
    } }).catch(() => {
      // Audit writes must not expose request data or turn a completed operation into a 500.
      console.error('Activity log write failed');
    });
  });
  next();
};
