import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { ExamStatus, QuestionType, UserRole } from '../../src/generated/prisma/client.js';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { signAccessToken } from '../../src/middleware/auth.js';
import { expireDueAttempts } from '../../src/jobs/attemptExpiry.js';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
describe.skipIf(!enabled)('PostgreSQL attempt integrity', () => {
 const studentId = crypto.randomUUID();
 const otherStudentId = crypto.randomUUID();
 const examinerId = crypto.randomUUID();
 const otherExaminerId = crypto.randomUUID();
 const adminId = crypto.randomUUID();
 const examId = crypto.randomUUID();
 const subjectiveExamId = crypto.randomUUID();
 const subjectiveQuestionId = crypto.randomUUID();
 const mixedExamId = crypto.randomUUID();
 const mixedMcqQuestionId = crypto.randomUUID();
 const mixedSubjectiveQuestionId = crypto.randomUUID();
 const lateExamId = crypto.randomUUID();
 const scheduledExamId = crypto.randomUUID();
 const authorExamId = crypto.randomUUID();
 let token = '';
 let otherToken = '';
 let examinerToken = '';
 let otherExaminerToken = '';
 let adminToken = '';
 let registeredStudentId = '';
 let invitedUserId = '';
 let createdExamId = '';
 beforeAll(async () => {
  const dbUrl = new URL(process.env.TEST_DATABASE_URL!);
  if (!dbUrl.pathname.toLowerCase().includes('test')) throw new Error('TEST_DATABASE_URL database name must include "test" to protect non-test data');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
  await prisma.$connect();
  await prisma.user.createMany({ data: [
   { id: studentId, name: 'Integration Student', email: `${studentId}@test.invalid`, passwordHash: 'unused', role: UserRole.STUDENT },
   { id: otherStudentId, name: 'Other Student', email: `${otherStudentId}@test.invalid`, passwordHash: 'unused', role: UserRole.STUDENT },
   { id: examinerId, name: 'Integration Examiner', email: `${examinerId}@test.invalid`, passwordHash: 'unused', role: UserRole.EXAMINER },
   { id: otherExaminerId, name: 'Other Examiner', email: `${otherExaminerId}@test.invalid`, passwordHash: 'unused', role: UserRole.EXAMINER },
   { id: adminId, name: 'Integration Admin', email: `${adminId}@test.invalid`, passwordHash: 'unused', role: UserRole.ADMIN },
  ] });
  await prisma.exam.create({ data: { id: examId, title: 'Integration', subject: 'Testing', durationMinutes: 30, status: ExamStatus.ACTIVE, createdById: examinerId, questions: { create: [{ text: 'Pick option zero', type: QuestionType.MCQ, marks: 5, displayOrder: 0, options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }] } } });
  await prisma.exam.create({ data: { id: subjectiveExamId, title: 'Written integration', subject: 'Testing', durationMinutes: 30, status: ExamStatus.ACTIVE, createdById: examinerId, questions: { create: [{ id: subjectiveQuestionId, text: 'Explain integrity', type: QuestionType.SUBJECTIVE, marks: 10, displayOrder: 0 }] } } });
  await prisma.exam.create({ data: { id: mixedExamId, title: 'Mixed integration', subject: 'Testing', durationMinutes: 30, status: ExamStatus.ACTIVE, createdById: examinerId, questions: { create: [
   { id: mixedMcqQuestionId, text: 'Choose the correct option', type: QuestionType.MCQ, marks: 5, displayOrder: 0, options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
   { id: mixedSubjectiveQuestionId, text: 'Explain your choice', type: QuestionType.SUBJECTIVE, marks: 10, displayOrder: 1 },
  ] } } });
  const scheduleStart = new Date(Date.now() + 30 * 60_000);
  await prisma.exam.create({ data: { id: scheduledExamId, title: 'Scheduled integration', subject: 'Testing', durationMinutes: 20, status: ExamStatus.SCHEDULED, availableFrom: scheduleStart, availableUntil: new Date(scheduleStart.getTime() + 60 * 60_000), createdById: examinerId, questions: { create: [{ text: 'Scheduled question', type: QuestionType.MCQ, marks: 2, displayOrder: 0, options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }] } } });
  const issue = async (id: string, name: string, email: string, role: UserRole) => {
   const sessionId = crypto.randomUUID();
   await prisma.authSession.create({ data: { id: sessionId, userId: id, expiresAt: new Date(Date.now() + 60 * 60_000) } });
   return signAccessToken({ id, name, email, role, active: true }, sessionId);
  };
  token = await issue(studentId, 'Integration Student', `${studentId}@test.invalid`, UserRole.STUDENT);
  otherToken = await issue(otherStudentId, 'Other Student', `${otherStudentId}@test.invalid`, UserRole.STUDENT);
  examinerToken = await issue(examinerId, 'Integration Examiner', `${examinerId}@test.invalid`, UserRole.EXAMINER);
  otherExaminerToken = await issue(otherExaminerId, 'Other Examiner', `${otherExaminerId}@test.invalid`, UserRole.EXAMINER);
  adminToken = await issue(adminId, 'Integration Admin', `${adminId}@test.invalid`, UserRole.ADMIN);
 });
 afterAll(async () => {
  await prisma.activityLog.deleteMany({ where: { actorId: { in: [studentId, otherStudentId, examinerId, otherExaminerId, adminId, ...(registeredStudentId ? [registeredStudentId] : []), ...(invitedUserId ? [invitedUserId] : [])] } } });
  await prisma.userInvitation.deleteMany({ where: { invitedById: adminId } });
  await prisma.proctoringEvent.deleteMany({ where: { attempt: { examId: { in: [examId, subjectiveExamId, mixedExamId, lateExamId, scheduledExamId] } } } });
  await prisma.result.deleteMany({ where: { examId: { in: [examId, subjectiveExamId, mixedExamId, lateExamId, scheduledExamId] } } });
  await prisma.attemptAnswer.deleteMany({ where: { attempt: { examId: { in: [examId, subjectiveExamId, mixedExamId, lateExamId, scheduledExamId] } } } });
  await prisma.attempt.deleteMany({ where: { examId: { in: [examId, subjectiveExamId, mixedExamId, lateExamId, scheduledExamId] } } });
  await prisma.exam.deleteMany({ where: { id: { in: [examId, subjectiveExamId, mixedExamId, lateExamId, scheduledExamId, authorExamId, ...(createdExamId ? [createdExamId] : [])] } } });
  await prisma.user.deleteMany({ where: { id: { in: [studentId, otherStudentId, examinerId, otherExaminerId, adminId, ...(registeredStudentId ? [registeredStudentId] : []), ...(invitedUserId ? [invitedUserId] : [])] } } });
  await prisma.$disconnect();
 });

 it('registers and logs in a student with a bcrypt hash and revocable session', async () => {
  const email = `${crypto.randomUUID()}@test.invalid`;
  const registered = await request(app).post('/api/auth/register').send({ name: 'New Student', email, password: 'a-long-integration-password' });
  expect(registered.status).toBe(201);
  registeredStudentId = registered.body.data.user.id;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: registeredStudentId } });
  expect(user.passwordHash).not.toBe('a-long-integration-password');
  expect(await bcrypt.compare('a-long-integration-password', user.passwordHash)).toBe(true);
  const login = await request(app).post('/api/auth/login').send({ email, password: 'a-long-integration-password', role: 'ADMIN' });
  expect(login.status).toBe(200);
  expect(login.body.data.user.role).toBe('Student');
  const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${login.body.data.token}`);
  expect(logout.status).toBe(204);
  const revoked = await request(app).get('/api/results').set('Authorization', `Bearer ${login.body.data.token}`);
  expect(revoked.status).toBe(401);
 });

 it('provisions invited roles through a one-time invitation token', async () => {
  const email = `${crypto.randomUUID()}@test.invalid`;
  const invitation = await request(app).post('/api/users/invitations').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Invited Examiner', email, role: 'Examiner' });
  expect(invitation.status).toBe(201);
  const accepted = await request(app).post('/api/auth/accept-invitation').send({ token: invitation.body.data.token, password: 'another-long-integration-password' });
  expect(accepted.status).toBe(201);
  invitedUserId = accepted.body.data.user.id;
  expect(accepted.body.data.user.role).toBe('Examiner');
  const replay = await request(app).post('/api/auth/accept-invitation').send({ token: invitation.body.data.token, password: 'another-long-integration-password' });
  expect(replay.status).toBe(400);
 });

 it('creates and retrieves an examination and question with role-safe answer keys', async () => {
  const created = await request(app).post('/api/exams').set('Authorization', `Bearer ${examinerToken}`).send({ title: 'Route-created exam', subject: 'Testing', durationMinutes: 20, status: 'Active', availableFrom: new Date(Date.now() - 60_000).toISOString() });
  expect(created.status).toBe(201);
  createdExamId = created.body.data.id;
  const question = await request(app).post(`/api/exams/${createdExamId}/questions`).set('Authorization', `Bearer ${examinerToken}`).send({ question: { type: 'mcq', text: 'Pick the first option', marks: 7, options: ['A', 'B', 'C', 'D'], correctOption: 0 } });
  expect(question.status).toBe(201);
  const authorView = await request(app).get(`/api/exams/${createdExamId}`).set('Authorization', `Bearer ${examinerToken}`);
  expect(authorView.body.data.questions[0].correctOption).toBe(0);
  const studentView = await request(app).get(`/api/exams/${createdExamId}`).set('Authorization', `Bearer ${token}`);
  expect(studentView.status).toBe(200);
  expect(studentView.body.data.questions[0].correctOption).toBeUndefined();
 });

 it('does not reveal correct answers to a student', async () => {
  const response = await request(app).get(`/api/exams/${examId}`).set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
  expect(response.body.data.questions[0].correctOption).toBeUndefined();
  expect(response.body.data.questions[0].options).toEqual(['A', 'B', 'C', 'D']);
 });

 it('lists scheduled exams before the start time but blocks early attempts', async () => {
  const list = await request(app).get('/api/exams').set('Authorization', `Bearer ${token}`);
  expect(list.status).toBe(200);
  expect(list.body.data.some((exam: { id: string }) => exam.id === scheduledExamId)).toBe(true);
  const detail = await request(app).get(`/api/exams/${scheduledExamId}`).set('Authorization', `Bearer ${token}`);
  expect(detail.status).toBe(200);
  expect(detail.body.data.status).toBe('Scheduled');
  const early = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId: scheduledExamId });
  expect(early.status).toBe(404);
  await prisma.exam.update({ where: { id: scheduledExamId }, data: { availableFrom: new Date(Date.now() - 1000), availableUntil: new Date(Date.now() + 30 * 60_000) } });
  const opened = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId: scheduledExamId });
  expect(opened.status).toBe(201);
 });

 it('enforces attempt ownership and accepts submission once with stable result', async () => {
  const start = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId });
  expect(start.status).toBe(201);
  const attemptId = start.body.data.id;
  const adminSummary = await request(app).get('/api/attempts/summary').set('Authorization', `Bearer ${adminToken}`);
  expect(adminSummary.status).toBe(200);
  expect(adminSummary.body.data.count).toBeGreaterThanOrEqual(1);
  expect(adminSummary.body.data.liveCount).toBeGreaterThanOrEqual(1);
  const otherExaminerSummary = await request(app).get('/api/attempts/summary').set('Authorization', `Bearer ${otherExaminerToken}`);
  expect(otherExaminerSummary.status).toBe(200);
  expect(otherExaminerSummary.body.data.count).toBe(0);
  expect(otherExaminerSummary.body.data.liveCount).toBe(0);
  const forbidden = await request(app).post(`/api/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${otherToken}`).send({ answers: { 0: 0 } });
  expect(forbidden.status).toBe(404);
  const saved = await request(app).put(`/api/attempts/${attemptId}/progress`).set('Authorization', `Bearer ${token}`).send({ questionIndex: 0, answers: { 0: 0 } });
  expect(saved.status).toBe(204);
  expect(await prisma.attemptAnswer.count({ where: { attemptId } })).toBe(1);
  const resumed = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId });
  expect(resumed.status).toBe(200);
  expect(resumed.body.data.id).toBe(attemptId);
  expect(resumed.body.data.answers).toEqual({ 0: 0 });
  const event = await request(app).post(`/api/proctoring-events/attempt/${attemptId}`).set('Authorization', `Bearer ${token}`).send({ type: 'TAB_SWITCH', metadata: { count: 1 } });
  expect(event.status).toBe(201);
  expect(await prisma.proctoringEvent.count({ where: { attemptId } })).toBe(1);
  const [first, repeat] = await Promise.all([
   request(app).post(`/api/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${token}`).send({ answers: { 0: 0 } }),
   request(app).post(`/api/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${token}`).send({ answers: { 0: 0 } }),
  ]);
  expect(first.status).toBe(200);
  expect(repeat.status).toBe(200);
  expect(repeat.body.data.attemptId).toBe(first.body.data.attemptId);
  const result = await prisma.result.findUniqueOrThrow({ where: { attemptId } });
  expect(Number(result.obtainedMarks)).toBe(5);
  expect(await prisma.result.count({ where: { attemptId } })).toBe(1);
  const ownResults = await request(app).get('/api/results').set('Authorization', `Bearer ${token}`);
  expect(ownResults.status).toBe(200);
  expect(ownResults.body.data.some((item: { id: string }) => item.id === result.id)).toBe(true);
  const resultDetails = await request(app).get(`/api/results/${result.id}`).set('Authorization', `Bearer ${token}`);
  expect(resultDetails.status).toBe(200);
  expect(resultDetails.body.data.questions[0].answer).toBe(0);
  expect(resultDetails.body.data.questions[0].correctOption).toBeUndefined();
  expect(resultDetails.body.data.questions[0].correctAnswer).toBeUndefined();
  const otherStudentResult = await request(app).get(`/api/results/${result.id}`).set('Authorization', `Bearer ${otherToken}`);
  expect(otherStudentResult.status).toBe(404);
 });

 it('does not accept changed answers after the server deadline', async () => {
  await prisma.exam.create({ data: { id: lateExamId, title: 'Late', subject: 'Testing', durationMinutes: 30, status: ExamStatus.ACTIVE, createdById: examinerId, questions: { create: [{ text: 'Pick option zero', type: QuestionType.MCQ, marks: 5, displayOrder: 0, options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }] } } });
  const start = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId: lateExamId });
  const attemptId = start.body.data.id as string;
  await prisma.attempt.update({ where: { id: attemptId }, data: { deadlineAt: new Date(Date.now() - 1000) } });
  const swept = await expireDueAttempts();
  expect(swept).toBeGreaterThanOrEqual(1);
  const submitted = await request(app).post(`/api/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${token}`).send({ answers: { 0: 0 } });
  expect(submitted.status).toBe(200);
  const savedAnswer = await prisma.attemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId: (await prisma.question.findFirstOrThrow({ where: { examId: lateExamId } })).id } } });
  expect(savedAnswer?.answer).toBeNull();
 });

 it('scores MCQs and keeps subjective answers pending in mixed-question submissions', async () => {
  const start = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId: mixedExamId });
  expect(start.status).toBe(201);
  const attemptId = start.body.data.id as string;
  const submitted = await request(app).post(`/api/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${token}`).send({ answers: { 0: 1, 1: 'A written explanation' } });
  expect(submitted.status).toBe(200);

  const result = await prisma.result.findUniqueOrThrow({ where: { attemptId } });
  expect(Number(result.obtainedMarks)).toBe(5);
  expect(Number(result.maximumMarks)).toBe(15);
  expect(result.evaluationStatus).toBe('PENDING_REVIEW');
  expect(result.publicationStatus).toBe('UNPUBLISHED');
  const answers = await prisma.attemptAnswer.findMany({ where: { attemptId } });
  expect(answers).toHaveLength(2);
  expect(answers.find((answer) => answer.questionId === mixedMcqQuestionId)?.awardedMarks?.toString()).toBe('5');
  expect(answers.find((answer) => answer.questionId === mixedSubjectiveQuestionId)?.answer).toBe('A written explanation');
 });

 it('restricts subjective grading to the examiner who owns the exam and publishes when complete', async () => {
  const start = await request(app).post('/api/attempts/start').set('Authorization', `Bearer ${token}`).send({ examId: subjectiveExamId });
  const attemptId = start.body.data.id as string;
  await request(app).post(`/api/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${token}`).send({ answers: { 0: 'A written response' } });
  const result = await prisma.result.findUniqueOrThrow({ where: { attemptId } });
  const pendingStudentView = await request(app).get(`/api/results/${result.id}`).set('Authorization', `Bearer ${token}`);
  expect(pendingStudentView.status).toBe(404);
  const duplicateGrades = await request(app).patch(`/api/results/${result.id}/evaluation`).set('Authorization', `Bearer ${examinerToken}`).send({ grades: [{ questionId: subjectiveQuestionId, marks: 8 }, { questionId: subjectiveQuestionId, marks: 8 }] });
  expect(duplicateGrades.status).toBe(400);
  const payload = { grades: [{ questionId: subjectiveQuestionId, marks: 8, feedback: 'Clear explanation.' }] };
  const forbidden = await request(app).patch(`/api/results/${result.id}/evaluation`).set('Authorization', `Bearer ${otherExaminerToken}`).send(payload);
  expect(forbidden.status).toBe(403);
  const graded = await request(app).patch(`/api/results/${result.id}/evaluation`).set('Authorization', `Bearer ${examinerToken}`).send(payload);
  expect(graded.status).toBe(200);
  expect(graded.body.data.status).toBe('Graded');
  expect(graded.body.data.score).toBe('8/10');
  const publishedStudentView = await request(app).get(`/api/results/${result.id}`).set('Authorization', `Bearer ${token}`);
  expect(publishedStudentView.status).toBe(200);
  expect(publishedStudentView.body.data.questions[0].feedback).toBe('Clear explanation.');
 });

 it('revokes active sessions when an administrator deactivates an account', async () => {
  const deactivated = await request(app).patch(`/api/users/${otherStudentId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ active: false });
  expect(deactivated.status).toBe(200);
  const blocked = await request(app).get('/api/results').set('Authorization', `Bearer ${otherToken}`);
  expect(blocked.status).toBe(401);
  const reactivated = await request(app).patch(`/api/users/${otherStudentId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ active: true });
  expect(reactivated.status).toBe(200);
  const revokedStillBlocked = await request(app).get('/api/results').set('Authorization', `Bearer ${otherToken}`);
  expect(revokedStillBlocked.status).toBe(401);
 });
});
