import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { HelmetOptions } from 'helmet';
import type { RequestHandler } from 'express';
import { Prisma } from './generated/prisma/client.js';
import { prisma } from './db/prisma.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { authRouter } from './modules/auth/routes.js';
import { userRouter } from './modules/users/routes.js';
import { examRouter } from './modules/exams/routes.js';
import { attemptRouter } from './modules/attempts/routes.js';
import { resultRouter } from './modules/results/routes.js';
import { proctoringRouter } from './modules/proctoring/routes.js';
import { activityRouter } from './modules/activities/routes.js';
export const app = express();

const helmetMiddleware = helmet as unknown as (
  options?: Readonly<HelmetOptions>
) => RequestHandler;

app.disable('x-powered-by');
app.use(helmetMiddleware());
app.disable('x-powered-by');
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((x) => x.trim()) }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', apiLimiter);
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.get('/api/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    res.json({ success: true, data: { status: 'ready', database: 'connected' } });
  } catch {
    res.status(503).json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable' } });
  }
});
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/exams', examRouter);
app.use('/api/attempts', attemptRouter);
app.use('/api/results', resultRouter);
app.use('/api/proctoring-events', proctoringRouter);
app.use('/api/activities', activityRouter);
app.use(notFound);
app.use(errorHandler);




export default app;
