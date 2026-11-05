import { Router } from 'express';
import { AttemptStatus, ExamStatus, FinalizationStatus, Prisma, UserRole } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { auditSuccessfulMutation } from '../../middleware/audit.js';
import { validateBody } from '../../middleware/validate.js';
import { progressSchema } from '../schemas.js';
import { HttpError, requireUuid } from '../../shared/errors.js';
import { finalizeAttempt, saveAnswers } from './service.js';
import { z } from 'zod';

export const attemptRouter = Router();
attemptRouter.use(authenticate, auditSuccessfulMutation);
const startSchema = z.object({ examId: z.string().uuid() });
const listQuerySchema = z.object({ examId: z.string().uuid().optional() });

attemptRouter.get('/', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Attempt filters are invalid');
  const rows = await prisma.attempt.findMany({
    where: {
      ...(parsed.data.examId ? { examId: parsed.data.examId } : {}),
      ...(req.user!.role === UserRole.EXAMINER ? { exam: { createdById: req.user!.id } } : {}),
    },
    include: { student: { select: { id: true, name: true, email: true } }, exam: { select: { id: true, title: true } }, result: { select: { evaluationStatus: true, publicationStatus: true } } },
    orderBy: { startedAt: 'desc' }, take: 500,
  });
  res.json({ success: true, data: rows.map((row) => ({ id: row.id, studentId: row.student.id, studentName: row.student.name, studentEmail: row.student.email, examId: row.exam.id, examTitle: row.exam.title, startedAt: row.startedAt.toISOString(), deadlineAt: row.deadlineAt.toISOString(), submittedAt: row.submittedAt?.toISOString() ?? null, status: row.status, evaluationStatus: row.result?.evaluationStatus ?? null, publicationStatus: row.result?.publicationStatus ?? null })) });
});

attemptRouter.get('/summary', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), async (req, res) => {
  const where = req.user!.role === UserRole.EXAMINER ? { exam: { createdById: req.user!.id } } : {};
  const [count, liveCount] = await Promise.all([
    prisma.attempt.count({ where }),
    prisma.attempt.count({ where: { ...where, status: AttemptStatus.IN_PROGRESS } }),
  ]);
  res.json({ success: true, data: { count, liveCount } });
});

attemptRouter.post('/start', allowRoles(UserRole.STUDENT), validateBody(startSchema), async (req, res) => {
  const now = new Date();
  const exam = await prisma.exam.findFirst({ where: { id: req.body.examId, status: { in: [ExamStatus.ACTIVE, ExamStatus.SCHEDULED] }, AND: [{ OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] }, { OR: [{ availableUntil: null }, { availableUntil: { gt: now } }] }] }, include: { questions: { orderBy: { displayOrder: 'asc' } } } });
  if (!exam) throw new HttpError(404, 'EXAM_UNAVAILABLE', 'Examination is not available');
  if (!exam.questions.length) throw new HttpError(409, 'EXAM_EMPTY', 'Examination has no questions');
  let deadlineAt = new Date(now.getTime() + exam.durationMinutes * 60_000);
  if (exam.availableUntil && exam.availableUntil < deadlineAt) deadlineAt.setTime(exam.availableUntil.getTime());
  const started = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT true AS locked WHERE pg_advisory_xact_lock(hashtextextended(${`${req.user!.id}:${exam.id}`}, 0)) IS NULL`);
    const existing = await tx.attempt.findUnique({ where: { studentId_examId: { studentId: req.user!.id, examId: exam.id } }, include: { answers: true } });
    if (existing) return { attempt: existing, created: false };
    const attempt = await tx.attempt.create({ data: { studentId: req.user!.id, examId: exam.id, startedAt: now, deadlineAt }, include: { answers: true } });
    return { attempt, created: true };
  });
  const { attempt } = started;
  if (attempt.status !== AttemptStatus.IN_PROGRESS || attempt.deadlineAt <= now || attempt.finalizationStatus === FinalizationStatus.FINALIZED) {
    if (attempt.status === AttemptStatus.IN_PROGRESS && attempt.deadlineAt <= now) await finalizeAttempt(attempt.id, null);
    throw new HttpError(409, 'ATTEMPT_ALREADY_CLOSED', 'This examination attempt has already been submitted or has expired.');
  }
  deadlineAt = attempt.deadlineAt;
  const savedByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer.answer]));
  const answers = Object.fromEntries(exam.questions.flatMap((question, index) => {
    const answer = savedByQuestion.get(question.id);
    return typeof answer === 'number' || typeof answer === 'string' ? [[index, answer]] : [];
  }));
  res.status(started.created ? 201 : 200).json({ success: true, data: { id: attempt.id, studentId: attempt.studentId, examId: attempt.examId, answers, startTime: attempt.startedAt.getTime(), endTime: deadlineAt.getTime(), status: 'in-progress' } });
});

attemptRouter.put('/:id/progress', allowRoles(UserRole.STUDENT), validateBody(progressSchema), async (req, res) => {
  const attemptId = requireUuid(req.params.id);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "attempts" WHERE id = ${attemptId}::uuid FOR UPDATE`);
    const attempt = await tx.attempt.findUnique({ where: { id: attemptId }, include: { exam: { include: { questions: { orderBy: { displayOrder: 'asc' } } } } } });
    if (!attempt || attempt.studentId !== req.user!.id) throw new HttpError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found');
    if (attempt.status !== AttemptStatus.IN_PROGRESS || Date.now() >= attempt.deadlineAt.getTime()) throw new HttpError(409, 'ATTEMPT_CLOSED', 'Attempt is closed');
    await saveAnswers(tx, attempt.id, attempt.exam.questions, req.body.answers);
  });
  res.status(204).end();
});

attemptRouter.post('/:id/submit', allowRoles(UserRole.STUDENT), validateBody(progressSchema), async (req, res) => {
  const result = await finalizeAttempt(requireUuid(req.params.id), req.user!.id, req.body.answers);
  res.json({ success: true, data: { attemptId: result.attemptId } });
});
