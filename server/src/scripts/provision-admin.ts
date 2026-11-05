import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Prisma, UserRole } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

const input = z.object({
  ADMIN_NAME: z.string().trim().min(1).max(160),
  ADMIN_EMAIL: z.email().max(320).transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(14).max(128),
}).parse(process.env);

try {
  const passwordHash = await bcrypt.hash(input.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  const user = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT true AS locked WHERE pg_advisory_xact_lock(948112, 1) IS NULL`);
    const adminCount = await tx.user.count({ where: { role: UserRole.ADMIN } });
    if (adminCount > 0) throw new Error('Administrator already exists; bootstrap is disabled. Use a one-time invitation instead.');
    return tx.user.create({ data: { name: input.ADMIN_NAME, email: input.ADMIN_EMAIL, passwordHash, role: UserRole.ADMIN } });
  });
  console.info(`Initial administrator provisioned: ${user.id} (${user.email})`);
} finally {
  await prisma.$disconnect();
}
