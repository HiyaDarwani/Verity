import bcrypt from 'bcrypt';
import { z } from 'zod';
import { UserRole } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

const input = z.object({
  ADMIN_EMAIL: z.email().max(320).transform((email) => email.toLowerCase()),
  NEW_ADMIN_PASSWORD: z.string().min(14).max(128),
}).parse(process.env);

try {
  const user = await prisma.user.findUnique({ where: { email: input.ADMIN_EMAIL }, select: { id: true, role: true } });

  if (!user || user.role !== UserRole.ADMIN) throw new Error('The selected administrator account was not found.');
  const passwordHash = await bcrypt.hash(input.NEW_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  console.info(`Administrator password updated and active sessions revoked for ${input.ADMIN_EMAIL}.`);
} finally {
  await prisma.$disconnect();
}
