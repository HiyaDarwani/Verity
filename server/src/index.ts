import { env } from './config/env.js';
import { app } from './app.js';
import { prisma } from './db/prisma.js';
import { startAttemptExpiryWorker } from './jobs/attemptExpiry.js';
const server = app.listen(env.PORT, () => console.info(`Verity API listening on port ${env.PORT}`));
const stopExpiryWorker = startAttemptExpiryWorker();
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  stopExpiryWorker();
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
});
