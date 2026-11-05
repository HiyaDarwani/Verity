import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma, UserRole } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { HttpError, requireUuid } from '../../shared/errors.js';
import { inviteUserSchema } from '../schemas.js';
import { auditSuccessfulMutation } from '../../middleware/audit.js';
export const userRouter = Router();
userRouter.use(authenticate, allowRoles(UserRole.ADMIN), auditSuccessfulMutation);
const dto = (u: { id: string; name: string; email: string; role: UserRole; active: boolean }) => ({ ...u, role: ({ STUDENT: 'Student', EXAMINER: 'Examiner', ADMIN: 'Administrator' } as const)[u.role] });
const roleMap = { Student: UserRole.STUDENT, Examiner: UserRole.EXAMINER, Administrator: UserRole.ADMIN } as const;
userRouter.post('/invitations', validateBody(inviteUserSchema), async (req, res) => {
 const body = req.body;
 const now = new Date();
 const token = randomBytes(32).toString('hex');
 const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
 const invite = await prisma.$transaction(async (tx) => {
  await tx.$queryRaw(Prisma.sql`SELECT true AS locked WHERE pg_advisory_xact_lock(hashtextextended(${body.email}, 0)) IS NULL`);
  if (await tx.user.findUnique({ where: { email: body.email }, select: { id: true } })) throw new HttpError(409, 'EMAIL_EXISTS', 'An account already uses this email');
  const activeInvite = await tx.userInvitation.findFirst({ where: { email: body.email, usedAt: null, expiresAt: { gt: now } }, select: { id: true } });
  if (activeInvite) throw new HttpError(409, 'INVITATION_EXISTS', 'A valid invitation already exists for this email');
  return tx.userInvitation.create({ data: { name: body.name, email: body.email, role: roleMap[body.role as keyof typeof roleMap], tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt, invitedById: req.user!.id } });
 });
 res.status(201).json({ success: true, data: { id: invite.id, email: invite.email, role: body.role, token, expiresAt: expiresAt.toISOString() } });
});
userRouter.get('/', async (_req, res) => { const rows = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { createdAt: 'desc' } }); res.json({ success: true, data: rows.map(dto) }); });
userRouter.get('/:id', async (req, res) => { const row = await prisma.user.findUnique({ where: { id: requireUuid(req.params.id) }, select: { id: true, name: true, email: true, role: true, active: true } }); if (!row) throw new HttpError(404, 'NOT_FOUND', 'User not found'); res.json({ success: true, data: dto(row) }); });
userRouter.put('/:id', validateBody(z.object({ name: z.string().trim().min(1).max(160).optional(), email: z.email().max(320).optional(), role: z.enum(['Student', 'Examiner', 'Administrator']).optional() }).refine((x) => Object.values(x).some((v) => v !== undefined))), async (req, res) => { const b = req.body; const row = await prisma.user.update({ where: { id: requireUuid(req.params.id) }, data: { name: b.name, email: b.email?.toLowerCase(), role: b.role ? roleMap[b.role as keyof typeof roleMap] : undefined }, select: { id: true, name: true, email: true, role: true, active: true } }); res.json({ success: true, data: dto(row) }); });
userRouter.patch('/:id/status', validateBody(z.object({ active: z.boolean() })), async (req, res) => {
 const userId = requireUuid(req.params.id);
 await prisma.$transaction(async (tx) => {
  await tx.user.update({ where: { id: userId }, data: { active: req.body.active } });
  if (!req.body.active) {
   await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
 });
 res.json({ success: true, data: { active: req.body.active } });
});
