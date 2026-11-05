import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { UserRole } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { authenticate, signAccessToken } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { acceptInvitationSchema, registerSchema, loginSchema } from '../schemas.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors.js';
import { authLimiter } from '../../middleware/rateLimit.js';

export const authRouter = Router();
const safeUser = (user: { id: string; name: string; email: string; role: UserRole }) => ({ id: user.id, name: user.name, email: user.email, role: ({ STUDENT: 'Student', EXAMINER: 'Examiner', ADMIN: 'Administrator' } as const)[user.role] });
async function issueSession(user: { id: string; name: string; email: string; role: UserRole }) {
  const sessionId = randomUUID();
  const token = signAccessToken({ ...user, active: true }, sessionId);
  const claims = jwt.decode(token) as JwtPayload;
  const expiresAt = new Date((claims.exp ?? Math.floor(Date.now() / 1000) + 3600) * 1000);
  await prisma.authSession.create({ data: { id: sessionId, userId: user.id, expiresAt } });
  return { token, user: safeUser(user) };
}

const digestInvitation = (token: string) => createHash('sha256').update(token).digest('hex');
async function recordAuthActivity(userId: string, action: string) {
  try {
    await prisma.activityLog.create({ data: { actorId: userId, action, entityType: 'authentication', entityId: userId } });
  } catch {
    // Authentication remains available if the best-effort audit sink is unavailable.
    console.error('Authentication activity log write failed');
  }
}

// Public self-registration is limited to student accounts.
authRouter.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { name: req.body.name, email: req.body.email, passwordHash, role: UserRole.STUDENT }, select: { id: true, name: true, email: true, role: true } });
  await recordAuthActivity(user.id, 'ACCOUNT_REGISTERED');
  res.status(201).json({ success: true, data: await issueSession(user) });
});

authRouter.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !user.active || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  await recordAuthActivity(user.id, 'LOGIN_SUCCEEDED');
  res.json({ success: true, data: await issueSession(safe) });
});

authRouter.post('/accept-invitation', authLimiter, validateBody(acceptInvitationSchema), async (req, res) => {
  const { token, password } = req.body;
  const user = await prisma.$transaction(async (tx) => {
    const invite = await tx.userInvitation.findUnique({ where: { tokenHash: digestInvitation(token) } });
    if (!invite || invite.usedAt || invite.expiresAt <= new Date()) throw new HttpError(400, 'INVITATION_INVALID', 'Invitation is invalid or expired');
    const claimed = await tx.userInvitation.updateMany({ where: { id: invite.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new HttpError(409, 'INVITATION_USED', 'Invitation has already been used');
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    return tx.user.create({ data: { name: invite.name, email: invite.email, passwordHash, role: invite.role }, select: { id: true, name: true, email: true, role: true } });
  });
  await recordAuthActivity(user.id, 'INVITATION_ACCEPTED');
  res.status(201).json({ success: true, data: await issueSession(user) });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  await prisma.authSession.updateMany({ where: { id: req.authSessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAuthActivity(req.user!.id, 'LOGOUT_SUCCEEDED');
  res.status(204).end();
});

authRouter.get('/me', authenticate, async (req, res) => {
  const { id, name, email, role } = req.user!;
  res.json({ success: true, data: { id, name, email, role: ({ STUDENT: 'Student', EXAMINER: 'Examiner', ADMIN: 'Administrator' } as const)[role] } });
});
