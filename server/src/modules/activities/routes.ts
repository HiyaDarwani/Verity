import { Router } from 'express';
import { UserRole } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
export const activityRouter = Router();
activityRouter.get('/', authenticate, allowRoles(UserRole.ADMIN, UserRole.EXAMINER), async (req, res) => {
 const rows = await prisma.activityLog.findMany({
  where: req.user!.role === UserRole.EXAMINER ? { actorId: req.user!.id } : {},
  orderBy: { occurredAt: 'desc' },
  take: 100,
 });
 res.json({ success: true, data: rows.map((r) => ({ id: r.id, description: `${r.action} ${r.entityType}${r.entityId ? ` ${r.entityId}` : ''}`, timestamp: r.occurredAt.toISOString() })) });
});
