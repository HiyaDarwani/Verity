import { Router } from 'express';
import { UserRole, ExamStatus, AttemptStatus, QuestionType, Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { examInputSchema, questionInputSchema } from '../schemas.js';
import { HttpError, requireUuid } from '../../shared/errors.js';
import { auditSuccessfulMutation } from '../../middleware/audit.js';

export const examRouter = Router();
examRouter.use(authenticate, auditSuccessfulMutation);
const examInclude = { questions: { orderBy: { displayOrder: 'asc' as const } } };
const statusMap = { Draft: ExamStatus.DRAFT, Scheduled: ExamStatus.SCHEDULED, Active: ExamStatus.ACTIVE, Completed: ExamStatus.COMPLETED } as const;
const statusToWire = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', ACTIVE: 'Active', COMPLETED: 'Completed' } as const;
const toDto = (exam: any, includeKeys: boolean, attemptStatus?: AttemptStatus) => ({
  id: exam.id, title: exam.title, subject: exam.subject, description: exam.description ?? undefined, instructions: exam.instructions ?? undefined,
  date: exam.availableFrom?.toISOString() ?? '', availableUntil: exam.availableUntil?.toISOString() ?? undefined, durationMinutes: exam.durationMinutes, totalMarks: exam.questions.reduce((sum: number, q: any) => sum + Number(q.marks), 0),
  status: statusToWire[exam.status as keyof typeof statusToWire],
  ...(attemptStatus ? { attemptStatus } : {}),
  questions: exam.questions.map((q: any) => ({ id: q.id, type: q.type === QuestionType.MCQ ? 'mcq' : 'sub', text: q.text, marks: Number(q.marks), ...(q.type === QuestionType.MCQ ? { options: q.options, ...(includeKeys ? { correctOption: q.correctAnswer } : {}) } : {}) })),
});

examRouter.get('/', async (req, res) => {
  const student = req.user!.role === UserRole.STUDENT;
  const now = new Date();
  const exams = await prisma.exam.findMany({
    where: student ? { status: { in: [ExamStatus.ACTIVE, ExamStatus.SCHEDULED] }, OR: [{ availableUntil: null }, { availableUntil: { gt: now } }] } : req.user!.role === UserRole.EXAMINER ? { createdById: req.user!.id } : {},
    include: student ? { ...examInclude, attempts: { where: { studentId: req.user!.id }, select: { status: true } } } : examInclude, orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: exams.map((e: any) => toDto(e, !student, student ? e.attempts?.[0]?.status : undefined)) });
});

examRouter.get('/:id', async (req, res) => {
  const student = req.user!.role === UserRole.STUDENT;
  const exam = await prisma.exam.findUnique({ where: { id: requireUuid(req.params.id) }, include: student ? { ...examInclude, attempts: { where: { studentId: req.user!.id }, select: { status: true } } } : examInclude });
  if (!exam) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  if (req.user!.role === UserRole.EXAMINER && exam.createdById !== req.user!.id) throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this examination');
  if (req.user!.role === UserRole.STUDENT && (exam.status !== ExamStatus.ACTIVE && exam.status !== ExamStatus.SCHEDULED || exam.availableUntil && exam.availableUntil <= new Date())) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  res.json({ success: true, data: toDto(exam, !student, student ? (exam as any).attempts?.[0]?.status : undefined) });
});

examRouter.post('/', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), validateBody(examInputSchema), async (req, res) => {
  const body = req.body;
  const availableFrom = body.availableFrom ? new Date(body.availableFrom) : body.date ? new Date(body.date) : null;
  const availableUntil = body.availableUntil ? new Date(body.availableUntil) : null;
  if (availableFrom && availableUntil && availableUntil <= availableFrom) throw new HttpError(400, 'INVALID_AVAILABILITY', 'Availability end must be after its start');
  const exam = await prisma.exam.create({ data: { title: body.title, subject: body.subject, description: body.description, instructions: body.instructions, durationMinutes: body.durationMinutes, availableFrom, availableUntil, status: statusMap[body.status as keyof typeof statusMap] ?? ExamStatus.DRAFT, createdById: req.user!.id }, include: examInclude });
  res.status(201).json({ success: true, data: toDto(exam, true) });
});

examRouter.put('/:id', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), validateBody(examInputSchema.partial()), async (req, res) => {
  const existing = await prisma.exam.findUnique({ where: { id: requireUuid(req.params.id) } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  if (req.user!.role === UserRole.EXAMINER && existing.createdById !== req.user!.id) throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
  const b = req.body;
  const changesExamContent = ['title', 'subject', 'description', 'instructions', 'durationMinutes', 'date', 'availableFrom', 'availableUntil'].some((key) => b[key] !== undefined);
  if (changesExamContent && await prisma.attempt.count({ where: { examId: existing.id } })) throw new HttpError(409, 'EXAM_HAS_ATTEMPTS', 'Examination content is locked after an attempt starts');
  const nextAvailableFrom = b.availableFrom || b.date ? new Date(b.availableFrom ?? b.date) : existing.availableFrom;
  const nextAvailableUntil = b.availableUntil === undefined ? existing.availableUntil : b.availableUntil === null ? null : new Date(b.availableUntil);
  if (nextAvailableFrom && nextAvailableUntil && nextAvailableUntil <= nextAvailableFrom) throw new HttpError(400, 'INVALID_AVAILABILITY', 'Availability end must be after its start');
  const exam = await prisma.exam.update({ where: { id: existing.id }, data: { title: b.title, subject: b.subject, description: b.description, instructions: b.instructions, durationMinutes: b.durationMinutes, availableFrom: b.availableFrom || b.date ? new Date(b.availableFrom ?? b.date) : undefined, availableUntil: b.availableUntil === undefined ? undefined : b.availableUntil === null ? null : new Date(b.availableUntil), status: b.status ? statusMap[b.status as keyof typeof statusMap] : undefined }, include: examInclude });
  res.json({ success: true, data: toDto(exam, true) });
});

examRouter.delete('/:id', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: requireUuid(req.params.id) } });
  if (!exam) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  if (req.user!.role === UserRole.EXAMINER && exam.createdById !== req.user!.id) throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
  if (await prisma.attempt.count({ where: { examId: exam.id } })) throw new HttpError(409, 'EXAM_HAS_ATTEMPTS', 'An examination with attempts cannot be deleted');
  await prisma.exam.delete({ where: { id: exam.id } });
  res.status(204).end();
});

examRouter.post('/:id/questions', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), validateBody(questionInputSchema), async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: requireUuid(req.params.id) }, include: { _count: { select: { questions: true } } } });
  if (!exam) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  if (req.user!.role === UserRole.EXAMINER && exam.createdById !== req.user!.id) throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
  if (await prisma.attempt.count({ where: { examId: exam.id } })) throw new HttpError(409, 'EXAM_HAS_ATTEMPTS', 'Questions are locked after an attempt starts');
  const q = req.body.question;
  await prisma.question.create({ data: { examId: exam.id, text: q.text, type: q.type === 'mcq' ? QuestionType.MCQ : QuestionType.SUBJECTIVE, marks: new Prisma.Decimal(q.marks), displayOrder: exam._count.questions, options: q.options, correctAnswer: q.type === 'mcq' ? q.correctOption : Prisma.JsonNull } });
  const updated = await prisma.exam.findUniqueOrThrow({ where: { id: exam.id }, include: examInclude });
  res.status(201).json({ success: true, data: toDto(updated, true) });
});

examRouter.put('/:id/questions/:questionId', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), validateBody(questionInputSchema), async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: requireUuid(req.params.id) } });
  if (!exam) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  if (req.user!.role === UserRole.EXAMINER && exam.createdById !== req.user!.id) throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
  const existing = await prisma.question.findFirst({ where: { id: requireUuid(req.params.questionId), examId: exam.id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Question not found');
  if (await prisma.attempt.count({ where: { examId: exam.id } })) throw new HttpError(409, 'EXAM_HAS_ATTEMPTS', 'Questions are locked after an attempt starts');
  const q = req.body.question;
  await prisma.question.update({ where: { id: existing.id }, data: { text: q.text, type: q.type === 'mcq' ? QuestionType.MCQ : QuestionType.SUBJECTIVE, marks: new Prisma.Decimal(q.marks), options: q.options, correctAnswer: q.type === 'mcq' ? q.correctOption : Prisma.JsonNull } });
  const updated = await prisma.exam.findUniqueOrThrow({ where: { id: exam.id }, include: examInclude });
  res.json({ success: true, data: toDto(updated, true) });
});

examRouter.delete('/:id/questions/:questionId', allowRoles(UserRole.EXAMINER, UserRole.ADMIN), async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: requireUuid(req.params.id) } });
  if (!exam) throw new HttpError(404, 'NOT_FOUND', 'Examination not found');
  if (req.user!.role === UserRole.EXAMINER && exam.createdById !== req.user!.id) throw new HttpError(403, 'FORBIDDEN', 'You do not own this examination');
  if (await prisma.attempt.count({ where: { examId: exam.id } })) throw new HttpError(409, 'EXAM_HAS_ATTEMPTS', 'Questions cannot be removed after attempts have started');
  const question = await prisma.question.findFirst({ where: { id: requireUuid(req.params.questionId), examId: exam.id } });
  if (!question) throw new HttpError(404, 'NOT_FOUND', 'Question not found');
  await prisma.question.delete({ where: { id: question.id } });
  const remaining = await prisma.question.findMany({ where: { examId: exam.id }, orderBy: { displayOrder: 'asc' } });
  await prisma.$transaction(remaining.map((item, index) => prisma.question.update({ where: { id: item.id }, data: { displayOrder: index } })));
  const updated = await prisma.exam.findUniqueOrThrow({ where: { id: exam.id }, include: examInclude });
  res.json({ success: true, data: toDto(updated, true) });
});
